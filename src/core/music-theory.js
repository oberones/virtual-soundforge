const ROOTS = {
  "C": 60,
  "C#": 61,
  "D": 62,
  "D#": 63,
  "E": 64,
  "F": 65,
  "F#": 66,
  "G": 67,
  "G#": 68,
  "A": 69,
  "A#": 70,
  "B": 71
};

const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10]
};

export function getScalePitches(key, scale, octaveBase) {
  const rootMidi = ROOTS[key] || ROOTS.C;
  const offsets = SCALES[scale] || SCALES.major;
  const base = rootMidi + (octaveBase - 4) * 12;
  const result = [];

  for (let octave = -1; octave <= 2; octave += 1) {
    offsets.forEach(function (offset) {
      result.push(base + offset + octave * 12);
    });
  }

  return result.sort(function (left, right) {
    return left - right;
  });
}

export function midiToSoundBoxNote(midi) {
  return midi - 12;
}

export function degreeToMidi(key, scale, octaveBase, degree) {
  const notes = getScalePitches(key, scale, octaveBase);
  return notes[degree % notes.length];
}
