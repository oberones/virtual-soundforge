const DEFAULT_PATTERN_ROWS = 16;

export function createProjectFromForm(form) {
  return {
    mode: form.mode || "random",
    seed: form.seed || "soundbox-seed",
    music: {
      key: form.key || "C",
      scale: form.scale || "major",
      tempo: clamp(Math.round(form.tempo || 112), 60, 180),
      bars: clamp(Math.round(form.bars || 8), 4, 16),
      beatsPerBar: 4,
      rowsPerBeat: 4,
      patternRows: DEFAULT_PATTERN_ROWS
    },
    controls: {
      density: clamp(form.density, 0, 1),
      complexity: clamp(form.complexity, 0, 1),
      variation: clamp(form.variation, 0, 1)
    },
    instrumentation: [
      {
        role: "lead",
        presetQuery: "Softy",
        octaveBase: 5,
        voicing: {
          attack: 10,
          sustain: 42,
          release: 52,
          drive: 40,
          panAmount: 72,
          delayAmount: 84
        }
      },
      {
        role: "bass",
        presetQuery: "Filter Bass 1",
        octaveBase: 3,
        voicing: {
          attack: 4,
          sustain: 28,
          release: 34,
          drive: 52,
          panAmount: 20,
          delayAmount: 24
        }
      },
      {
        role: "pad",
        presetQuery: "Mellow",
        octaveBase: 4,
        voicing: {
          attack: 18,
          sustain: 64,
          release: 72,
          drive: 34,
          panAmount: 96,
          delayAmount: 110
        }
      }
    ]
  };
}

export function projectToSummary(project, composition) {
  const lines = [
    "Mode: " + project.mode,
    "Seed: " + project.seed,
    "Key: " + project.music.key + " " + project.music.scale,
    "Tempo: " + project.music.tempo + " BPM",
    "Bars: " + project.music.bars,
    "Pattern rows: " + project.music.patternRows,
    "Tracks: " + composition.tracks.length,
    "Sections: " + composition.sections.map(function (section) {
      return section.name + "(" + section.lengthBars + " bars)";
    }).join(", ")
  ];

  composition.tracks.forEach(function (track) {
    lines.push(
      track.role + ": " +
      track.notes.length + " note events, preset " +
      track.instrument.presetName
    );
  });

  return lines.join("\n");
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
