const LOOKAHEAD_SECONDS = 0.18;
const SCHEDULER_INTERVAL_MS = 40;
const START_DELAY_SECONDS = 0.05;
const STOP_FADE_SECONDS = 0.08;

export function createLivePlaybackEngine() {
  let audioContext = null;
  let sessionGain = null;
  let schedulerId = null;
  let isRunning = false;
  let nextRowTime = 0;
  let nextRowIndex = 0;
  let prepared = null;

  return {
    async start(composition) {
      prepared = prepareComposition(composition);
      if (!prepared || !prepared.totalRows) {
        return false;
      }

      const context = await ensureAudioContext();
      isRunning = true;
      nextRowIndex = nextRowIndex % prepared.totalRows;
      nextRowTime = context.currentTime + START_DELAY_SECONDS;
      beginSession(context);
      startScheduler();
      scheduleReadyRows();
      return true;
    },

    updateComposition(composition) {
      prepared = prepareComposition(composition);
      if (prepared && prepared.totalRows) {
        nextRowIndex = nextRowIndex % prepared.totalRows;
      } else {
        nextRowIndex = 0;
      }
    },

    stop() {
      isRunning = false;
      stopScheduler();
      nextRowIndex = 0;
      nextRowTime = 0;
      fadeOutSession();
    },

    isRunning() {
      return isRunning;
    }
  };

  async function ensureAudioContext() {
    if (!audioContext) {
      audioContext = new window.AudioContext();
    }

    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    return audioContext;
  }

  function beginSession(context) {
    fadeOutSession();

    sessionGain = context.createGain();
    sessionGain.gain.setValueAtTime(0.0001, context.currentTime);
    sessionGain.gain.exponentialRampToValueAtTime(1, context.currentTime + 0.03);
    sessionGain.connect(context.destination);
  }

  function fadeOutSession() {
    if (!audioContext || !sessionGain) {
      sessionGain = null;
      return;
    }

    const gainNode = sessionGain;
    const now = audioContext.currentTime;
    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setValueAtTime(Math.max(0.0001, gainNode.gain.value), now);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + STOP_FADE_SECONDS);
    window.setTimeout(function () {
      gainNode.disconnect();
    }, Math.ceil(STOP_FADE_SECONDS * 1000) + 40);
    sessionGain = null;
  }

  function startScheduler() {
    stopScheduler();
    schedulerId = window.setInterval(scheduleReadyRows, SCHEDULER_INTERVAL_MS);
  }

  function stopScheduler() {
    if (schedulerId != null) {
      window.clearInterval(schedulerId);
      schedulerId = null;
    }
  }

  function scheduleReadyRows() {
    if (!isRunning || !audioContext || !sessionGain || !prepared || !prepared.totalRows) {
      return;
    }

    const scheduleUntil = audioContext.currentTime + LOOKAHEAD_SECONDS;
    while (nextRowTime < scheduleUntil) {
      scheduleRow(prepared, nextRowIndex, nextRowTime, audioContext, sessionGain);
      nextRowTime += prepared.rowDuration;
      nextRowIndex = (nextRowIndex + 1) % prepared.totalRows;
    }
  }
}

function prepareComposition(composition) {
  if (!composition) {
    return null;
  }

  const rowDuration = 60 / composition.tempo / 4;
  const totalRows = composition.totalBars * composition.rowsPerPattern;
  const rows = new Array(totalRows);

  for (let rowIndex = 0; rowIndex < totalRows; rowIndex += 1) {
    rows[rowIndex] = [];
  }

  composition.tracks.forEach(function (track, trackIndex) {
    const voice = createVoiceProfile(track, trackIndex, composition.tracks.length);
    track.notes.forEach(function (note) {
      const rowIndex = (note.bar * composition.rowsPerPattern + note.row) % totalRows;
      rows[rowIndex].push({
        note: note,
        voice: voice
      });
    });
  });

  return {
    rowDuration: rowDuration,
    totalRows: totalRows,
    rows: rows
  };
}

function scheduleRow(prepared, rowIndex, when, audioContext, outputNode) {
  const events = prepared.rows[rowIndex];
  if (!events || !events.length) {
    return;
  }

  events.forEach(function (event) {
    scheduleNote(audioContext, outputNode, event.note, event.voice, prepared.rowDuration, when);
  });
}

function scheduleNote(audioContext, outputNode, note, voice, rowDuration, when) {
  const requestedDuration = note.lengthRows * rowDuration;
  const holdSeconds = Math.max(0.08, Math.min(requestedDuration, voice.sustainSeconds));
  const noteSeconds = voice.attackSeconds + holdSeconds + voice.releaseSeconds;
  const stopAt = when + noteSeconds + 0.03;
  const frequency = midiToFrequency(note.midi);
  const detunedFrequency = frequency * Math.pow(2, voice.detuneCents / 1200);

  const panner = audioContext.createStereoPanner();
  panner.pan.setValueAtTime(voice.pan, when);

  const noteGain = audioContext.createGain();
  noteGain.gain.setValueAtTime(0.0001, when);
  noteGain.gain.linearRampToValueAtTime(voice.level, when + voice.attackSeconds);
  noteGain.gain.setValueAtTime(voice.level, when + voice.attackSeconds + holdSeconds);
  noteGain.gain.linearRampToValueAtTime(0.0001, when + voice.attackSeconds + holdSeconds + voice.releaseSeconds);

  const oscA = audioContext.createOscillator();
  const gainA = audioContext.createGain();
  oscA.type = voice.waveformA;
  oscA.frequency.setValueAtTime(frequency, when);
  gainA.gain.setValueAtTime(voice.mixA, when);

  const oscB = audioContext.createOscillator();
  const gainB = audioContext.createGain();
  oscB.type = voice.waveformB;
  oscB.frequency.setValueAtTime(detunedFrequency, when);
  gainB.gain.setValueAtTime(voice.mixB * 0.72, when);

  const shimmer = audioContext.createOscillator();
  const shimmerGain = audioContext.createGain();
  shimmer.type = "sine";
  shimmer.frequency.setValueAtTime(frequency * 2, when);
  shimmerGain.gain.setValueAtTime(voice.brightness * 0.08, when);

  oscA.connect(gainA);
  oscB.connect(gainB);
  shimmer.connect(shimmerGain);
  gainA.connect(noteGain);
  gainB.connect(noteGain);
  shimmerGain.connect(noteGain);
  noteGain.connect(panner);
  panner.connect(outputNode);

  oscA.start(when);
  oscB.start(when);
  shimmer.start(when);
  oscA.stop(stopAt);
  oscB.stop(stopAt);
  shimmer.stop(stopAt);

  window.setTimeout(function () {
    gainA.disconnect();
    gainB.disconnect();
    shimmerGain.disconnect();
    noteGain.disconnect();
    panner.disconnect();
  }, Math.ceil(Math.max(0, stopAt - audioContext.currentTime) * 1000) + 80);
}

function createVoiceProfile(track, trackIndex, trackCount) {
  const instrument = track.instrument.customInstrument || [];
  const waveformA = instrument[0] || 0;
  const waveformB = instrument[4] || 0;
  const detune = instrument[7] || 0;
  const attack = mapTime(instrument[10], 0.01, 0.45);
  const sustain = mapTime(instrument[11], 0.12, 1.8);
  const release = mapTime(instrument[12], 0.18, 2.4);
  const brightness = 0.12 + (instrument[21] || 0) / 255 * 0.38;
  const width = trackCount <= 1 ? 0 : trackIndex / (trackCount - 1);

  return {
    waveformA: toWaveformName(waveformA),
    waveformB: toWaveformName(waveformB),
    mixA: Math.max(0.22, (instrument[1] || 180) / 255),
    mixB: Math.max(0, (instrument[5] || 0) / 255),
    detuneCents: detune * 2.5,
    attackSeconds: attack,
    sustainSeconds: sustain,
    releaseSeconds: release,
    pan: width * 1.4 - 0.7,
    brightness: brightness,
    level: 0.12
  };
}

function toWaveformName(index) {
  const names = ["sine", "square", "sawtooth", "triangle"];
  return names[index] || "sine";
}

function midiToFrequency(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function mapTime(value, min, max) {
  const amount = Math.max(0, Math.min(255, value || 0)) / 255;
  return min + (max - min) * amount;
}
