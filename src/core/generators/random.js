import { createSeededRandom } from "../seeded-rng.js";
import { getScalePitches } from "../music-theory.js";

export function createRandomGenerator() {
  return {
    generate(project) {
      const random = createSeededRandom(project.seed);
      const bars = project.music.bars;
      const progression = createProgression(random, project.music.scale, bars);
      const tracks = project.instrumentation.map(function (instrumentation) {
        return createTrack(project, instrumentation, progression, random);
      });

      return {
        seed: project.seed,
        tempo: project.music.tempo,
        rowsPerPattern: project.music.patternRows,
        totalBars: bars,
        sections: [
          {
            name: "A",
            lengthBars: bars
          }
        ],
        tracks: tracks,
        debug: {
          progression: progression,
          controls: project.controls
        }
      };
    }
  };
}

function createProgression(random, scale, bars) {
  const majorPool = [
    [0, 4, 5, 3],
    [0, 5, 3, 4],
    [0, 3, 4, 5]
  ];
  const minorPool = [
    [0, 5, 6, 4],
    [0, 3, 4, 6],
    [0, 6, 3, 4]
  ];
  const source = scale === "minor" ? minorPool : majorPool;
  const base = random.pick(source);
  const progression = [];

  for (let bar = 0; bar < bars; bar += 1) {
    progression.push(base[bar % base.length]);
  }

  return progression;
}

function createTrack(project, instrumentation, progression, random) {
  const scalePitches = getScalePitches(
    project.music.key,
    project.music.scale,
    instrumentation.octaveBase
  );

  const notes = [];
  for (let bar = 0; bar < progression.length; bar += 1) {
    notes.push.apply(
      notes,
      createHarmonicBar(project, instrumentation, progression[bar], bar, scalePitches, random)
    );
  }

  return {
    role: instrumentation.role,
    instrument: {
      presetQuery: instrumentation.presetQuery || null,
      presetName: instrumentation.presetName || instrumentation.presetQuery || instrumentation.role,
      customInstrument: instrumentation.customInstrument || null,
      voicing: instrumentation.voicing || null
    },
    notes: notes
  };
}

function createHarmonicBar(project, instrumentation, degree, bar, scalePitches, random) {
  const voiceNote = createVoiceNote(scalePitches, degree, instrumentation.chordTone || 0);
  const variation = project.controls.variation;
  const complexity = project.controls.complexity;
  const entries = [];
  const startRow = random.chance(variation * 0.35) ? 1 : 0;
  const shouldSplit = complexity > 0.62 && random.chance(variation * 0.55);
  const baseLength = computeNoteLength(project.music.noteLength, shouldSplit);

  entries.push({
    bar: bar,
    row: startRow,
    lengthRows: baseLength,
    midi: voiceNote
  });

  if (shouldSplit) {
    const move = random.chance(0.5) ? 1 : -1;
    const idx = scalePitches.indexOf(voiceNote);
    const target = scalePitches[clamp(idx + move, 0, scalePitches.length - 1)];
    entries.push({
      bar: bar,
      row: 8,
      lengthRows: Math.max(4, Math.round(baseLength * 0.55)),
      midi: target
    });
  }

  return entries;
}

function createVoiceNote(scalePitches, degree, chordTone) {
  const rootIndex = clamp(5 + degree, 0, scalePitches.length - 1);
  const toneOffsets = [0, 2, 4];
  return scalePitches[
    clamp(rootIndex + toneOffsets[chordTone % toneOffsets.length], 0, scalePitches.length - 1)
  ];
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function computeNoteLength(noteLength, shouldSplit) {
  const longLength = Math.round(6 + noteLength * 8);
  if (shouldSplit) {
    return clamp(Math.round(longLength * 0.72), 4, 12);
  }
  return clamp(longLength, 6, 15);
}
