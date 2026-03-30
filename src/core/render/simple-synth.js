const SAMPLE_RATE = 44100;

export function renderCompositionToWave(composition) {
  const rowDuration = 60 / composition.tempo / 4;
  const totalRows = composition.totalBars * composition.rowsPerPattern;
  const tailSeconds = 2.4;
  const totalSeconds = totalRows * rowDuration + tailSeconds;
  const totalSamples = Math.ceil(totalSeconds * SAMPLE_RATE);
  const left = new Float32Array(totalSamples);
  const right = new Float32Array(totalSamples);

  composition.tracks.forEach(function (track, trackIndex) {
    const voice = createVoiceProfile(track, trackIndex, composition.tracks.length);
    track.notes.forEach(function (note) {
      renderNote(left, right, note, voice, rowDuration, composition.rowsPerPattern);
    });
  });

  normalize(left, right);
  return createWaveFile(left, right);
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
    mixA: Math.max(0.2, (instrument[1] || 180) / 255),
    mixB: Math.max(0, (instrument[5] || 0) / 255),
    detuneCents: detune * 2.5,
    attackSeconds: attack,
    sustainSeconds: sustain,
    releaseSeconds: release,
    pan: width * 1.4 - 0.7,
    brightness: brightness
  };
}

function renderNote(left, right, note, voice, rowDuration, rowsPerPattern) {
  const startSeconds = (note.bar * rowsPerPattern + note.row) * rowDuration;
  const requestedDuration = note.lengthRows * rowDuration;
  const holdSeconds = Math.max(0.08, Math.min(requestedDuration, voice.sustainSeconds));
  const noteSeconds = voice.attackSeconds + holdSeconds + voice.releaseSeconds;
  const startSample = Math.floor(startSeconds * SAMPLE_RATE);
  const noteSamples = Math.floor(noteSeconds * SAMPLE_RATE);
  const frequency = midiToFrequency(note.midi);
  const detunedFrequency = frequency * Math.pow(2, voice.detuneCents / 1200);

  for (let index = 0; index < noteSamples; index += 1) {
    const targetSample = startSample + index;
    if (targetSample >= left.length) {
      break;
    }

    const t = index / SAMPLE_RATE;
    const env = envelope(
      t,
      voice.attackSeconds,
      holdSeconds,
      voice.releaseSeconds
    );
    const harmonic = oscillator(voice.waveformA, frequency, t) * voice.mixA;
    const overtone = oscillator(voice.waveformB, detunedFrequency, t) * voice.mixB * 0.65;
    const shimmer = Math.sin(2 * Math.PI * frequency * 2 * t) * voice.brightness * 0.15;
    const sample = (harmonic + overtone + shimmer) * env * 0.16;
    const leftGain = Math.cos((voice.pan + 1) * Math.PI * 0.25);
    const rightGain = Math.sin((voice.pan + 1) * Math.PI * 0.25);

    left[targetSample] += sample * leftGain;
    right[targetSample] += sample * rightGain;
  }
}

function envelope(time, attack, hold, release) {
  if (time < attack) {
    return time / attack;
  }

  if (time < attack + hold) {
    return 1;
  }

  const releaseTime = time - attack - hold;
  if (releaseTime >= release) {
    return 0;
  }

  return 1 - releaseTime / release;
}

function oscillator(kind, frequency, time) {
  const phase = frequency * time;

  if (kind === "triangle") {
    const value = (phase % 1) * 4;
    return value < 2 ? value - 1 : 3 - value;
  }

  if (kind === "saw") {
    return 2 * (phase % 1) - 1;
  }

  if (kind === "square") {
    return (phase % 1) < 0.5 ? 1 : -1;
  }

  return Math.sin(2 * Math.PI * phase);
}

function toWaveformName(index) {
  const names = ["sine", "square", "saw", "triangle"];
  return names[index] || "sine";
}

function midiToFrequency(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function mapTime(value, min, max) {
  const amount = Math.max(0, Math.min(255, value || 0)) / 255;
  return min + (max - min) * amount;
}

function normalize(left, right) {
  let peak = 0;

  for (let index = 0; index < left.length; index += 1) {
    peak = Math.max(peak, Math.abs(left[index]), Math.abs(right[index]));
  }

  const gain = peak > 0.92 ? 0.92 / peak : 1;
  for (let index = 0; index < left.length; index += 1) {
    left[index] = softClip(left[index] * gain);
    right[index] = softClip(right[index] * gain);
  }
}

function softClip(value) {
  return Math.tanh(value * 1.4) / Math.tanh(1.4);
}

function createWaveFile(left, right) {
  const frameCount = left.length;
  const dataSize = frameCount * 4;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 2, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 4, true);
  view.setUint16(32, 4, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let index = 0; index < frameCount; index += 1) {
    view.setInt16(offset, floatToInt16(left[index]), true);
    view.setInt16(offset + 2, floatToInt16(right[index]), true);
    offset += 4;
  }

  return new Uint8Array(buffer);
}

function writeString(view, offset, value) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

function floatToInt16(value) {
  const clamped = Math.max(-1, Math.min(1, value));
  return clamped < 0 ? clamped * 32768 : clamped * 32767;
}
