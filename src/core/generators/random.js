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
    if (instrumentation.role === "bass") {
      notes.push.apply(notes, createBassBar(project, progression[bar], bar, scalePitches, random));
    } else if (instrumentation.role === "pad") {
      notes.push.apply(notes, createPadBar(project, progression[bar], bar, scalePitches, random));
    } else {
      notes.push.apply(notes, createLeadBar(project, progression[bar], bar, scalePitches, random));
    }
  }

  return {
    role: instrumentation.role,
    instrument: {
      presetQuery: instrumentation.presetQuery,
      presetName: instrumentation.presetQuery
    },
    notes: notes
  };
}

function createLeadBar(project, degree, bar, scalePitches, random) {
  const notes = [];
  const density = project.controls.density;
  const complexity = project.controls.complexity;
  const baseIndex = 7 + degree;
  const rhythmSteps = [0, 2, 4, 6, 8, 10, 12, 14];

  rhythmSteps.forEach(function (step) {
    const probability = density * 0.8 + (step === 0 ? 0.2 : 0);
    if (!random.chance(probability)) {
      return;
    }

    const movement = random.int(0, Math.max(1, Math.round(complexity * 4)));
    const direction = random.chance(0.5) ? 1 : -1;
    const index = clamp(baseIndex + movement * direction, 3, scalePitches.length - 4);
    notes.push({
      bar: bar,
      row: step,
      lengthRows: random.chance(0.2 + complexity * 0.4) ? 2 : 1,
      midi: scalePitches[index]
    });
  });

  return notes;
}

function createBassBar(project, degree, bar, scalePitches, random) {
  const rootIndex = clamp(2 + degree, 0, scalePitches.length - 1);
  const fifthIndex = clamp(rootIndex + 4, 0, scalePitches.length - 1);
  const cadence = [
    { row: 0, midi: scalePitches[rootIndex] },
    { row: 4, midi: scalePitches[fifthIndex] },
    { row: 8, midi: scalePitches[rootIndex] },
    { row: 12, midi: scalePitches[fifthIndex] }
  ];

  return cadence.filter(function (_, index) {
    return index === 0 || random.chance(0.78 + project.controls.density * 0.16);
  }).map(function (item) {
    return {
      bar: bar,
      row: item.row,
      lengthRows: 2,
      midi: item.midi
    };
  });
}

function createPadBar(project, degree, bar, scalePitches, random) {
  const rootIndex = clamp(5 + degree, 0, scalePitches.length - 1);
  const thirdIndex = clamp(rootIndex + 2, 0, scalePitches.length - 1);
  const fifthIndex = clamp(rootIndex + 4, 0, scalePitches.length - 1);
  const row = random.chance(project.controls.variation * 0.5) ? 4 : 0;

  return [
    { bar: bar, row: row, lengthRows: 8, midi: scalePitches[rootIndex] },
    { bar: bar, row: row, lengthRows: 8, midi: scalePitches[thirdIndex] },
    { bar: bar, row: row, lengthRows: 8, midi: scalePitches[fifthIndex] }
  ];
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
