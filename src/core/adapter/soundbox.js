import { midiToSoundBoxNote } from "../music-theory.js";

const MAX_CHANNELS = 16;
const DEFAULT_ROWS_PER_BEAT = 4;
const DEFAULT_MAX_PATTERNS = 36;
const OSC1_VOL = 1;
const OSC2_VOL = 5;
const ENV_ATTACK = 10;
const ENV_SUSTAIN = 11;
const ENV_RELEASE = 12;
const FX_DRIVE = 24;
const FX_PAN_AMT = 25;
const FX_DELAY_AMT = 27;

export function compositionToSoundBoxSong(composition) {
  const tempo = composition.tempo;
  const patternLen = composition.rowsPerPattern;
  const endPattern = composition.totalBars - 1;
  const tracks = composition.tracks.slice(0, MAX_CHANNELS);

  return {
    songData: tracks.map(function (track, index) {
      return buildChannel(track, endPattern, patternLen, index);
    }),
    rowLen: calcSamplesPerRow(tempo),
    patternLen: patternLen,
    endPattern: endPattern,
    numChannels: tracks.length
  };
}

function buildChannel(track, endPattern, patternLen) {
  const preset = findPreset(track.instrument.presetQuery);
  const instrument = cloneInstrument(preset.i);
  applyVoicing(instrument, track.instrument.voicing);
  const channel = {
    i: instrument,
    p: [],
    c: []
  };

  for (let row = 0; row < endPattern + 1; row += 1) {
    channel.p[row] = row + 1;
  }

  for (let patternIndex = 0; patternIndex < DEFAULT_MAX_PATTERNS; patternIndex += 1) {
    channel.c.push({
      n: new Array(patternLen * 4).fill(0),
      f: new Array(patternLen * 2).fill(0)
    });
  }

  track.notes.forEach(function (note) {
    const pattern = channel.c[note.bar];
    if (!pattern) {
      return;
    }

    const row = clamp(note.row, 0, patternLen - 1);
    const soundBoxNote = midiToSoundBoxNote(note.midi);
    let targetColumn = -1;

    for (let column = 0; column < 4; column += 1) {
      const index = row + column * patternLen;
      if (pattern.n[index] === 0) {
        targetColumn = column;
        break;
      }
    }

    if (targetColumn === -1) {
      targetColumn = 0;
    }

    pattern.n[row + targetColumn * patternLen] = soundBoxNote;
  });

  return channel;
}

function findPreset(query) {
  const presets = window.gInstrumentPresets || [];
  const normalizedQuery = String(query || "").toLowerCase();
  let fallback = null;

  for (let index = 0; index < presets.length; index += 1) {
    const preset = presets[index];
    if (!preset.i) {
      continue;
    }

    if (!fallback) {
      fallback = preset;
    }

    if (String(preset.name).toLowerCase().indexOf(normalizedQuery) >= 0) {
      return preset;
    }
  }

  if (!fallback) {
    throw new Error("No instrument presets available.");
  }

  return fallback;
}

function cloneInstrument(instrument) {
  return instrument.slice();
}

function applyVoicing(instrument, voicing) {
  if (!voicing) {
    return;
  }

  instrument[ENV_ATTACK] = voicing.attack;
  instrument[ENV_SUSTAIN] = voicing.sustain;
  instrument[ENV_RELEASE] = voicing.release;
  instrument[FX_DRIVE] = voicing.drive;
  instrument[FX_PAN_AMT] = voicing.panAmount;
  instrument[FX_DELAY_AMT] = voicing.delayAmount;
  instrument[OSC1_VOL] = Math.min(255, instrument[OSC1_VOL] + 18);
  instrument[OSC2_VOL] = Math.min(255, instrument[OSC2_VOL] + 18);
}

function calcSamplesPerRow(bpm) {
  return Math.round((60 * 44100 / DEFAULT_ROWS_PER_BEAT) / bpm);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
