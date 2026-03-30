const DEFAULT_PATTERN_ROWS = 16;

export function createProjectFromForm(form) {
  return {
    mode: form.mode || "random",
    seed: form.seed || "harmonic-seed",
    music: {
      key: form.key || "C",
      scale: form.scale || "major",
      tempo: clamp(Math.round(form.tempo || 112), 60, 180),
      bars: clamp(Math.round(form.bars || 8), 4, 16),
      formStyle: form.formStyle || "balanced",
      style: form.style || "warm",
      voices: clamp(Math.round(form.voices || 3), 1, 6),
      noteLength: clamp(form.noteLength, 0.25, 1),
      beatsPerBar: 4,
      rowsPerBeat: 4,
      patternRows: DEFAULT_PATTERN_ROWS
    },
    controls: {
      density: clamp(form.density, 0, 1),
      complexity: clamp(form.complexity, 0, 1),
      variation: clamp(form.variation, 0, 1),
      drama: clamp(form.drama, 0, 1),
      evolution: clamp(form.evolution, 0, 1)
    },
    instrumentation: createHarmonicInstrumentation(
      form.style || "warm",
      clamp(Math.round(form.voices || 3), 1, 6)
    )
  };
}

export function projectToSummary(project, composition) {
  const totalPhrases = composition.phraseLibrary ? composition.phraseLibrary.length : 0;
  const lines = [
    "Mode: " + project.mode,
    "Seed: " + project.seed,
    "Key: " + project.music.key + " " + project.music.scale,
    "Tempo: " + project.music.tempo + " BPM",
    "Bars: " + project.music.bars,
    "Form: " + project.music.formStyle,
    "Style: " + project.music.style,
    "Voices: " + project.music.voices,
    "Note length: " + Math.round(project.music.noteLength * 100) + "%",
    "Drama: " + Math.round(project.controls.drama * 100) + "%",
    "Evolution: " + Math.round(project.controls.evolution * 100) + "%",
    "Pattern rows: " + project.music.patternRows,
    "Tracks: " + composition.tracks.length,
    "Phrases: " + totalPhrases,
    "Sections: " + composition.sections.map(function (section) {
      return section.name + " [" + section.role + "] (" + section.lengthBars + " bars, phrase size " + section.phraseBars + ")";
    }).join(", ")
  ];

  composition.tracks.forEach(function (track) {
    lines.push(
      track.role + ": " +
      track.phrases.length + " phrases, " +
      track.notes.length + " note events, preset " +
      track.instrument.presetName
    );
  });

  return lines.join("\n");
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function createHarmonicInstrumentation(style, voices) {
  const palette = [
    {
      role: "foundation",
      presetName: "Warm Pad",
      octaveBase: 4,
      chordTone: 0,
      customInstrument: makeCustomInstrument({
        osc1Waveform: 0,
        osc1Volume: 220,
        osc2Waveform: 3,
        osc2Volume: 84,
        envAttack: 18,
        envSustain: 72,
        envRelease: 84,
        fxFilter: 2,
        fxFreq: 196,
        fxResonance: 32,
        fxDrive: 28,
        fxDelayAmount: 36,
        fxDelayTime: 4
      }),
      voicing: {
        attack: 18,
        sustain: 72,
        release: 84,
        drive: 28,
        panAmount: 12,
        delayAmount: 36
      }
    },
    {
      role: "body",
      presetName: "Pure Organ",
      octaveBase: 5,
      chordTone: 1,
      customInstrument: makeCustomInstrument({
        osc1Waveform: 0,
        osc1Volume: 200,
        osc2Waveform: 0,
        osc2Volume: 72,
        envAttack: 10,
        envSustain: 76,
        envRelease: 78,
        fxFilter: 2,
        fxFreq: 210,
        fxResonance: 24,
        fxDrive: 24,
        fxDelayAmount: 28,
        fxDelayTime: 5
      }),
      voicing: {
        attack: 10,
        sustain: 76,
        release: 78,
        drive: 24,
        panAmount: 36,
        delayAmount: 28
      }
    },
    {
      role: "air",
      presetName: "Soft Glass",
      octaveBase: 5,
      chordTone: 2,
      customInstrument: makeCustomInstrument({
        osc1Waveform: 0,
        osc1Volume: 188,
        osc2Waveform: 0,
        osc2Volume: 58,
        osc2Detune: 4,
        envAttack: 22,
        envSustain: 64,
        envRelease: 92,
        fxFilter: 2,
        fxFreq: 224,
        fxResonance: 18,
        fxDrive: 22,
        fxDelayAmount: 44,
        fxDelayTime: 6
      }),
      voicing: {
        attack: 22,
        sustain: 64,
        release: 84,
        drive: 22,
        panAmount: 64,
        delayAmount: 44
      }
    },
    {
      role: "shimmer",
      presetName: "High Choir",
      octaveBase: 6,
      chordTone: 0,
      customInstrument: makeCustomInstrument({
        osc1Waveform: 0,
        osc1Volume: 170,
        osc2Waveform: 3,
        osc2Volume: 48,
        envAttack: 28,
        envSustain: 56,
        envRelease: 96,
        fxFilter: 2,
        fxFreq: 232,
        fxResonance: 12,
        fxDrive: 18,
        fxDelayAmount: 52,
        fxDelayTime: 6
      }),
      voicing: {
        attack: 28,
        sustain: 56,
        release: 96,
        drive: 18,
        panAmount: 80,
        delayAmount: 52
      }
    },
    {
      role: "halo",
      presetName: "Upper Harmonic",
      octaveBase: 6,
      chordTone: 1,
      customInstrument: makeCustomInstrument({
        osc1Waveform: 0,
        osc1Volume: 154,
        osc2Waveform: 0,
        osc2Volume: 42,
        envAttack: 24,
        envSustain: 50,
        envRelease: 92,
        fxFilter: 2,
        fxFreq: 238,
        fxResonance: 10,
        fxDrive: 18,
        fxDelayAmount: 58,
        fxDelayTime: 7
      }),
      voicing: {
        attack: 24,
        sustain: 50,
        release: 92,
        drive: 18,
        panAmount: 96,
        delayAmount: 58
      }
    },
    {
      role: "glass",
      presetName: "Upper Fifth",
      octaveBase: 6,
      chordTone: 2,
      customInstrument: makeCustomInstrument({
        osc1Waveform: 0,
        osc1Volume: 146,
        osc2Waveform: 3,
        osc2Volume: 36,
        envAttack: 26,
        envSustain: 46,
        envRelease: 88,
        fxFilter: 2,
        fxFreq: 242,
        fxResonance: 8,
        fxDrive: 16,
        fxDelayAmount: 62,
        fxDelayTime: 7
      }),
      voicing: {
        attack: 26,
        sustain: 46,
        release: 88,
        drive: 16,
        panAmount: 110,
        delayAmount: 62
      }
    }
  ];

  return applyStyleToPalette(palette, style).slice(0, voices);
}

function applyStyleToPalette(palette, style) {
  return palette.map(function (voice) {
    const next = {
      role: voice.role,
      presetName: voice.presetName,
      octaveBase: voice.octaveBase,
      chordTone: voice.chordTone,
      customInstrument: voice.customInstrument.slice(),
      voicing: {
        attack: voice.voicing.attack,
        sustain: voice.voicing.sustain,
        release: voice.voicing.release,
        drive: voice.voicing.drive,
        panAmount: voice.voicing.panAmount,
        delayAmount: voice.voicing.delayAmount
      }
    };

    if (style === "glassy") {
      next.presetName += " / Glassy";
      next.customInstrument[0] = 0;
      next.customInstrument[4] = 0;
      next.customInstrument[7] = Math.max(next.customInstrument[7], 6);
      next.customInstrument[21] = Math.min(255, next.customInstrument[21] + 28);
      next.customInstrument[27] = Math.min(140, next.customInstrument[27] + 8);
      next.voicing.release = Math.max(48, next.voicing.release - 8);
      if (voice.role !== "foundation") {
        next.octaveBase += 1;
      }
    } else if (style === "organ") {
      next.presetName += " / Organ";
      next.customInstrument[0] = 1;
      next.customInstrument[4] = 0;
      next.customInstrument[5] = Math.max(48, next.customInstrument[5] - 12);
      next.customInstrument[10] = Math.max(4, next.customInstrument[10] - 8);
      next.customInstrument[12] = Math.max(56, next.customInstrument[12] - 8);
      next.customInstrument[27] = Math.max(8, next.customInstrument[27] - 12);
      next.voicing.delayAmount = Math.max(8, next.voicing.delayAmount - 14);
      next.voicing.release = Math.max(56, next.voicing.release - 6);
      next.voicing.panAmount = Math.max(8, next.voicing.panAmount - 18);
      next.octaveBase -= 1;
      if (voice.role === "air" || voice.role === "shimmer" || voice.role === "halo" || voice.role === "glass") {
        next.octaveBase -= 1;
      }
    } else if (style === "dark") {
      next.presetName += " / Dark";
      next.customInstrument[0] = 3;
      next.customInstrument[4] = 0;
      next.customInstrument[21] = Math.max(120, next.customInstrument[21] - 46);
      next.customInstrument[24] = Math.min(40, next.customInstrument[24] + 4);
      next.voicing.release += 10;
      if (voice.role !== "foundation") {
        next.octaveBase -= 1;
      }
    } else if (style === "lush") {
      next.presetName += " / Lush";
      next.customInstrument[4] = 3;
      next.customInstrument[5] = Math.min(120, next.customInstrument[5] + 18);
      next.customInstrument[27] = Math.min(160, next.customInstrument[27] + 18);
      next.voicing.release += 16;
      next.voicing.delayAmount += 18;
      next.voicing.panAmount = Math.min(126, next.voicing.panAmount + 12);
    } else {
      next.presetName += " / Warm";
      next.customInstrument[0] = 3;
      next.customInstrument[4] = next.customInstrument[4] || 0;
      next.customInstrument[21] = Math.max(140, next.customInstrument[21] - 12);
      next.voicing.release += 6;
    }

    next.customInstrument[10] = clamp(next.voicing.attack, 0, 255);
    next.customInstrument[11] = clamp(next.voicing.sustain, 0, 255);
    next.customInstrument[12] = clamp(next.voicing.release, 0, 255);
    next.customInstrument[24] = clamp(next.voicing.drive, 0, 255);
    next.customInstrument[27] = clamp(next.voicing.delayAmount, 0, 255);

    return next;
  });
}

function makeCustomInstrument(options) {
  return [
    options.osc1Waveform || 0,
    options.osc1Volume || 192,
    128,
    0,
    options.osc2Waveform || 0,
    options.osc2Volume || 0,
    128,
    options.osc2Detune || 0,
    0,
    0,
    options.envAttack || 12,
    options.envSustain || 64,
    options.envRelease || 72,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    options.fxFilter || 2,
    options.fxFreq || 200,
    options.fxResonance || 24,
    0,
    options.fxDrive || 24,
    0,
    0,
    options.fxDelayAmount || 0,
    options.fxDelayTime || 4
  ];
}
