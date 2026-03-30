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
      voices: clamp(Math.round(form.voices || 3), 1, 6),
      noteLength: clamp(form.noteLength, 0.25, 1),
      beatsPerBar: 4,
      rowsPerBeat: 4,
      patternRows: DEFAULT_PATTERN_ROWS
    },
    controls: {
      density: clamp(form.density, 0, 1),
      complexity: clamp(form.complexity, 0, 1),
      variation: clamp(form.variation, 0, 1)
    },
    instrumentation: createHarmonicInstrumentation(
      clamp(Math.round(form.voices || 3), 1, 6)
    )
  };
}

export function projectToSummary(project, composition) {
  const lines = [
    "Mode: " + project.mode,
    "Seed: " + project.seed,
    "Key: " + project.music.key + " " + project.music.scale,
    "Tempo: " + project.music.tempo + " BPM",
    "Bars: " + project.music.bars,
    "Voices: " + project.music.voices,
    "Note length: " + Math.round(project.music.noteLength * 100) + "%",
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

function createHarmonicInstrumentation(voices) {
  const palette = [
    {
      role: "foundation",
      presetQuery: "Mellow",
      octaveBase: 3,
      lane: 0,
      voicing: {
        attack: 14,
        sustain: 68,
        release: 76,
        drive: 30,
        panAmount: 18,
        delayAmount: 44
      }
    },
    {
      role: "body",
      presetQuery: "Softy",
      octaveBase: 4,
      lane: 1,
      voicing: {
        attack: 12,
        sustain: 64,
        release: 72,
        drive: 34,
        panAmount: 54,
        delayAmount: 78
      }
    },
    {
      role: "air",
      presetQuery: "Bell",
      octaveBase: 5,
      lane: 2,
      voicing: {
        attack: 18,
        sustain: 58,
        release: 84,
        drive: 28,
        panAmount: 92,
        delayAmount: 112
      }
    },
    {
      role: "shimmer",
      presetQuery: "Mellow",
      octaveBase: 5,
      lane: 3,
      voicing: {
        attack: 20,
        sustain: 52,
        release: 88,
        drive: 26,
        panAmount: 112,
        delayAmount: 118
      }
    },
    {
      role: "halo",
      presetQuery: "Softy",
      octaveBase: 6,
      lane: 4,
      voicing: {
        attack: 24,
        sustain: 48,
        release: 92,
        drive: 24,
        panAmount: 126,
        delayAmount: 124
      }
    },
    {
      role: "glass",
      presetQuery: "Bell",
      octaveBase: 6,
      lane: 5,
      voicing: {
        attack: 22,
        sustain: 44,
        release: 86,
        drive: 22,
        panAmount: 104,
        delayAmount: 120
      }
    }
  ];

  return palette.slice(0, voices);
}
