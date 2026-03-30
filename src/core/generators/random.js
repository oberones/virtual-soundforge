import { createSeededRandom } from "../seeded-rng.js";
import { getScalePitches } from "../music-theory.js";

export function createRandomGenerator() {
  return {
    generate(project) {
      const random = createSeededRandom(project.seed);
      const bars = project.music.bars;
      const sectionPlan = createSectionPlan(project, random, project.music.scale, bars);
      const phraseLibrary = [];
      const tracks = project.instrumentation.map(function (instrumentation) {
        return createTrack(project, instrumentation, sectionPlan, phraseLibrary, random);
      });

      return {
        seed: project.seed,
        tempo: project.music.tempo,
        rowsPerPattern: project.music.patternRows,
        totalBars: bars,
        sections: sectionPlan.sections,
        phraseLibrary: phraseLibrary,
        tracks: tracks,
        debug: {
          mode: project.mode,
          sectionPlan: sectionPlan.sections.map(function (section) {
            return {
              id: section.id,
              role: section.role,
              progression: section.progression,
              phraseBars: section.phraseBars
            };
          }),
          phraseFamilies: tracks.map(function (track) {
            return {
              role: track.role,
              family: track.phraseFamily
            };
          }),
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

function createSectionPlan(project, random, scale, totalBars) {
  if (project.mode === "song") {
    return createSongSectionPlan(project, random, scale, totalBars);
  }

  const phraseBars = totalBars >= 8 ? 2 : 1;
  const sectionBars = totalBars >= 12 ? 4 : totalBars;
  const baseProgression = createProgression(random, scale, totalBars);
  const sections = [];

  for (let bar = 0, sectionIndex = 0; bar < totalBars; bar += sectionBars, sectionIndex += 1) {
    const lengthBars = Math.min(sectionBars, totalBars - bar);
    sections.push({
      id: "section-" + sectionIndex,
      name: String.fromCharCode(65 + sectionIndex),
      role: "part",
      startBar: bar,
      lengthBars: lengthBars,
      phraseBars: Math.min(phraseBars, lengthBars),
      progression: baseProgression.slice(bar, bar + lengthBars)
    });
  }

  return { sections: sections };
}

function createSongSectionPlan(project, random, scale, totalBars) {
  const templates = chooseSongTemplate(project, totalBars);
  const sections = [];
  let startBar = 0;

  templates.forEach(function (template, index) {
    if (startBar >= totalBars) {
      return;
    }

    const lengthBars = Math.min(template.lengthBars, totalBars - startBar);
    const progression = createRoleProgression(project, random, scale, template.role, lengthBars);
    sections.push({
      id: "section-" + index,
      name: template.label,
      role: template.role,
      startBar: startBar,
      lengthBars: lengthBars,
      phraseBars: Math.min(template.phraseBars, lengthBars),
      progression: progression
    });
    startBar += lengthBars;
  });

  return { sections: sections };
}

function chooseSongTemplate(project, totalBars) {
  const formStyle = project.music.formStyle;
  if (formStyle === "short") {
    if (totalBars <= 6) {
      return [
        { label: "Verse", role: "verse", lengthBars: Math.max(2, totalBars - 2), phraseBars: 2 },
        { label: "Chorus", role: "chorus", lengthBars: 2, phraseBars: 1 }
      ];
    }
    return [
      { label: "Verse", role: "verse", lengthBars: Math.max(4, totalBars - 4), phraseBars: 2 },
      { label: "Chorus", role: "chorus", lengthBars: 4, phraseBars: 2 }
    ];
  }

  if (formStyle === "full" && totalBars >= 10) {
    return [
      { label: "Intro", role: "intro", lengthBars: 2, phraseBars: 1 },
      { label: "Verse", role: "verse", lengthBars: 4, phraseBars: 2 },
      { label: "Chorus", role: "chorus", lengthBars: 4, phraseBars: 2 },
      { label: "Bridge", role: "bridge", lengthBars: 2, phraseBars: 2 },
      { label: "Chorus 2", role: "chorus", lengthBars: Math.max(2, totalBars - 12), phraseBars: 2 }
    ];
  }

  if (totalBars <= 6) {
    return [
      { label: "Intro", role: "intro", lengthBars: 2, phraseBars: 1 },
      { label: "Verse", role: "verse", lengthBars: Math.max(2, totalBars - 2), phraseBars: 2 }
    ];
  }

  if (totalBars <= 8) {
    return [
      { label: "Verse", role: "verse", lengthBars: 4, phraseBars: 2 },
      { label: "Chorus", role: "chorus", lengthBars: totalBars - 4, phraseBars: 2 }
    ];
  }

  if (totalBars <= 12) {
    return [
      { label: "Intro", role: "intro", lengthBars: 2, phraseBars: 1 },
      { label: "Verse", role: "verse", lengthBars: 4, phraseBars: 2 },
      { label: "Chorus", role: "chorus", lengthBars: 4, phraseBars: 2 },
      { label: "Bridge", role: "bridge", lengthBars: Math.max(2, totalBars - 10), phraseBars: 2 }
    ];
  }

  return [
    { label: "Intro", role: "intro", lengthBars: 2, phraseBars: 1 },
    { label: "Verse", role: "verse", lengthBars: 4, phraseBars: 2 },
    { label: "Chorus", role: "chorus", lengthBars: 4, phraseBars: 2 },
    { label: "Verse 2", role: "verse", lengthBars: 4, phraseBars: 2 },
    { label: "Chorus 2", role: "chorus", lengthBars: Math.max(2, totalBars - 14), phraseBars: 2 }
  ];
}

function createRoleProgression(project, random, scale, role, bars) {
  const progression = createProgression(random, scale, bars);
  const drama = project.controls.drama;

  if (role === "intro") {
    return progression.map(function (_, index) {
      return index === 0 ? 0 : progression[index - 1];
    });
  }

  if (role === "chorus") {
    return progression.map(function (degree, index) {
      if (index % 2 === 1 || drama > 0.6) {
        return scale === "minor" ? 6 : 5;
      }
      return degree;
    });
  }

  if (role === "bridge") {
    return progression.slice().reverse();
  }

  return progression;
}

function createTrack(project, instrumentation, sectionPlan, phraseLibrary, random) {
  const scalePitches = getScalePitches(
    project.music.key,
    project.music.scale,
    instrumentation.octaveBase
  );

  const phrases = [];
  const notes = [];
  const phraseFamily = createPhraseFamily(project, instrumentation, sectionPlan, scalePitches, random);
  const voiceState = {
    lastMidi: null
  };

  sectionPlan.sections.forEach(function (section, sectionIndex) {
    const sectionPhrases = createSectionPhrases(
      project,
      instrumentation,
      section,
      scalePitches,
      phraseFamily,
      phraseLibrary,
      voiceState,
      sectionPlan.sections[sectionIndex + 1] || null,
      random
    );
    phrases.push.apply(phrases, sectionPhrases);
  });

  phrases.forEach(function (phraseInstance) {
    notes.push.apply(notes, instantiatePhraseNotes(phraseInstance, phraseLibrary));
  });

  return {
    role: instrumentation.role,
    instrument: {
      presetQuery: instrumentation.presetQuery || null,
      presetName: instrumentation.presetName || instrumentation.presetQuery || instrumentation.role,
      customInstrument: instrumentation.customInstrument || null,
      voicing: instrumentation.voicing || null
    },
    phraseFamily: phraseFamily.map(function (phrase) { return phrase.id; }),
    phrases: phrases,
    notes: notes
  };
}

function createPhraseFamily(project, instrumentation, sectionPlan, scalePitches, random) {
  if (project.mode !== "phrase") {
    return [];
  }

  const family = [];
  const baseSection = sectionPlan.sections[0];
  const phraseBars = baseSection ? baseSection.phraseBars : 1;
  const familySize = Math.min(2, Math.max(1, Math.ceil(project.controls.variation * 2)));

  for (let index = 0; index < familySize; index += 1) {
    const phraseProgression = [];
    for (let bar = 0; bar < phraseBars; bar += 1) {
      phraseProgression.push(baseSection.progression[bar % baseSection.progression.length]);
    }

    family.push({
      id: instrumentation.role + "-family-" + index,
      lengthBars: phraseBars,
      notes: createPhrasePattern(project, instrumentation, phraseProgression, scalePitches, random, {
        octaveShift: index === 1 ? 1 : 0,
        rowOffset: index === 1 ? 1 : 0,
        role: baseSection.role
      })
    });
  }

  return family;
}

function createSectionPhrases(
  project,
  instrumentation,
  section,
  scalePitches,
  phraseFamily,
  phraseLibrary,
  voiceState,
  nextSection,
  random
) {
  const phrases = [];
  for (let offset = 0, phraseIndex = 0; offset < section.lengthBars; offset += section.phraseBars, phraseIndex += 1) {
    const phraseLengthBars = Math.min(section.phraseBars, section.lengthBars - offset);
    const phraseProgression = section.progression.slice(offset, offset + phraseLengthBars);
    const phraseId = createPhraseDefinition(
      project,
      instrumentation,
      section,
      phraseIndex,
      phraseProgression,
      phraseLengthBars,
      scalePitches,
      phraseFamily,
      phraseLibrary,
      voiceState,
      offset + section.phraseBars >= section.lengthBars,
      nextSection ? nextSection.role : null,
      random
    );

    phrases.push({
      phraseId: phraseId,
      sectionId: section.id,
      startBar: section.startBar + offset,
      lengthBars: phraseLengthBars
    });
  }

  return phrases;
}

function createPhraseDefinition(
  project,
  instrumentation,
  section,
  phraseIndex,
  phraseProgression,
  phraseLengthBars,
  scalePitches,
  phraseFamily,
  phraseLibrary,
  voiceState,
  isLastPhraseInSection,
  nextSectionRole,
  random
) {
  const phraseId = [
    instrumentation.role,
    section.id,
    "phrase",
    phraseIndex
  ].join("-");
  const notes = project.mode === "song"
    ? createSongPhraseDefinition(
        project,
        instrumentation,
        section,
        phraseIndex,
        phraseProgression,
        scalePitches,
        voiceState,
        isLastPhraseInSection,
        nextSectionRole,
        random
      )
    : project.mode === "phrase"
    ? createPhraseModeDefinition(
        project,
        instrumentation,
        section,
        phraseIndex,
        phraseLengthBars,
        phraseFamily,
        random
      )
    : createRandomPhraseDefinition(project, instrumentation, phraseProgression, scalePitches, random);

  phraseLibrary.push({
    id: phraseId,
    role: instrumentation.role,
    sectionId: section.id,
    lengthBars: phraseLengthBars,
    notes: notes
  });

  return phraseId;
}

function createRandomPhraseDefinition(project, instrumentation, phraseProgression, scalePitches, random) {
  const notes = [];
  for (let localBar = 0; localBar < phraseProgression.length; localBar += 1) {
    notes.push.apply(
      notes,
      createHarmonicBar(project, instrumentation, phraseProgression[localBar], localBar, scalePitches, random)
    );
  }
  return notes;
}

function createPhraseModeDefinition(
  project,
  instrumentation,
  section,
  phraseIndex,
  phraseLengthBars,
  phraseFamily,
  random
) {
  if (!phraseFamily.length) {
    return [];
  }

  const basePhrase = phraseFamily[phraseIndex % phraseFamily.length];
  const mutationLevel = computeMutationLevel(project, section, phraseIndex);
  const notes = mutatePhrase(basePhrase.notes, mutationLevel, instrumentation, section, random);

  return notes;
}

function createSongPhraseDefinition(
  project,
  instrumentation,
  section,
  phraseIndex,
  phraseProgression,
  scalePitches,
  voiceState,
  isLastPhraseInSection,
  nextSectionRole,
  random
) {
  const notes = [];
  let previousMidi = voiceState.lastMidi;
  if (project.controls.evolution < 0.35 && phraseIndex > 0 && voiceState.phraseTail) {
    previousMidi = voiceState.phraseTail;
  }
  for (let localBar = 0; localBar < phraseProgression.length; localBar += 1) {
    const result = createSongBarPattern(
      project,
      instrumentation,
      section,
      phraseIndex,
      phraseProgression[localBar],
      localBar,
      scalePitches,
      previousMidi,
      {
        isLastBarInPhrase: localBar === phraseProgression.length - 1,
        isLastPhraseInSection: isLastPhraseInSection,
        nextSectionRole: nextSectionRole
      },
      random
    );
    notes.push.apply(notes, result.notes);
    previousMidi = result.lastMidi;
  }
  voiceState.lastMidi = previousMidi;
  voiceState.phraseTail = previousMidi;
  return notes;
}

function instantiatePhraseNotes(phraseInstance, phraseLibrary) {
  const phrase = findPhrase(phraseLibrary, phraseInstance.phraseId);
  if (!phrase) {
    return [];
  }

  return phrase.notes.map(function (note) {
    return {
      bar: phraseInstance.startBar + note.bar,
      row: note.row,
      lengthRows: note.lengthRows,
      midi: note.midi
    };
  });
}

function createHarmonicBar(project, instrumentation, degree, localBar, scalePitches, random) {
  const voiceNote = createVoiceNote(scalePitches, degree, instrumentation.chordTone || 0);
  const variation = project.controls.variation;
  const complexity = project.controls.complexity;
  const entries = [];
  const startRow = random.chance(variation * 0.35) ? 1 : 0;
  const shouldSplit = complexity > 0.62 && random.chance(variation * 0.55);
  const baseLength = computeNoteLength(project.music.noteLength, shouldSplit);

  entries.push({
    bar: localBar,
    row: startRow,
    lengthRows: baseLength,
    midi: voiceNote
  });

  if (shouldSplit) {
    const move = random.chance(0.5) ? 1 : -1;
    const idx = scalePitches.indexOf(voiceNote);
    const target = scalePitches[clamp(idx + move, 0, scalePitches.length - 1)];
    entries.push({
      bar: localBar,
      row: 8,
      lengthRows: Math.max(4, Math.round(baseLength * 0.55)),
      midi: target
    });
  }

  return entries;
}

function createSongBarPattern(
  project,
  instrumentation,
  section,
  phraseIndex,
  degree,
  localBar,
  scalePitches,
  previousMidi,
  cadenceContext,
  random
) {
  const style = project.music.style || "warm";
  const baseLength = computeNoteLength(
    getRoleNoteLength(project.music.noteLength, section.role, project.controls.drama),
    section.role !== "intro" || project.controls.drama > 0.4
  );
  const primaryBase = createVoiceNote(scalePitches, degree, instrumentation.chordTone || 0);
  const secondaryBase = createVoiceNote(scalePitches, degree, (instrumentation.chordTone + 1) % 3);
  const tertiaryBase = createVoiceNote(scalePitches, degree, (instrumentation.chordTone + 2) % 3);
  const roleOctave = getRoleOctaveShift(section.role, instrumentation.role, style) * 12;
  const primary = resolveVoiceLedPitch(previousMidi, buildCandidateSet(primaryBase + roleOctave), primaryBase + roleOctave);
  const secondary = resolveVoiceLedPitch(primary, buildCandidateSet(secondaryBase + roleOctave), secondaryBase + roleOctave);
  const tertiary = resolveVoiceLedPitch(secondary, buildCandidateSet(tertiaryBase + roleOctave), tertiaryBase + roleOctave);

  if (section.role === "intro") {
    const notes = [{
        bar: localBar,
        row: style === "dark" ? 3 : 2,
        lengthRows: Math.max(6, baseLength - 2),
        midi: primary
      }];
    applyCadence(notes, section, cadenceContext, primary, secondary, tertiary, localBar, random);
    return {
      notes: notes,
      lastMidi: notes[notes.length - 1].midi
    };
  }

  if (section.role === "verse") {
    const notes = [{
      bar: localBar,
        row: localBar % 2 === 0 ? 0 : (style === "organ" ? 0 : 1),
        lengthRows: baseLength,
        midi: primary
      }];

    if ((localBar + phraseIndex) % 2 === 1 || random.chance(0.25 + project.controls.variation * 0.2 + project.controls.evolution * 0.2 + getStyleSplitBias(style))) {
      notes.push({
        bar: localBar,
        row: style === "dark" ? 9 : 8,
        lengthRows: Math.max(4, Math.round(baseLength * 0.45)),
        midi: secondary
      });
    }

    applyCadence(notes, section, cadenceContext, primary, secondary, tertiary, localBar, random);
    return {
      notes: notes,
      lastMidi: notes[notes.length - 1].midi
    };
  }

  if (section.role === "chorus") {
    const notes = [
      {
        bar: localBar,
        row: 0,
        lengthRows: Math.min(15, baseLength + 1),
        midi: primary
      },
      {
        bar: localBar,
        row: style === "organ" ? 8 : 6,
        lengthRows: Math.max(4, Math.round(baseLength * (0.45 + project.controls.drama * 0.15))),
        midi: tertiary
      }
    ];
    applyCadence(notes, section, cadenceContext, primary, secondary, tertiary, localBar, random);
    return {
      notes: notes,
      lastMidi: notes[notes.length - 1].midi
    };
  }

  if (section.role === "bridge") {
    const notes = [
      {
        bar: localBar,
        row: 1,
        lengthRows: Math.max(4, Math.round(baseLength * 0.55)),
        midi: secondary
      },
      {
        bar: localBar,
        row: style === "glassy" ? 6 : 7,
        lengthRows: Math.max(3, Math.round(baseLength * 0.35)),
        midi: tertiary
      },
      {
        bar: localBar,
        row: 11,
        lengthRows: 3,
        midi: resolveVoiceLedPitch(tertiary, buildCandidateSet(findNeighborPitch(scalePitches, primary, random)), primary)
      }
    ];
    applyCadence(notes, section, cadenceContext, primary, secondary, tertiary, localBar, random);
    return {
      notes: notes,
      lastMidi: notes[notes.length - 1].midi
    };
  }

  const notes = [{
      bar: localBar,
      row: 0,
      lengthRows: baseLength,
      midi: primary
    }];
  applyCadence(notes, section, cadenceContext, primary, secondary, tertiary, localBar, random);
  return {
    notes: notes,
    lastMidi: notes[notes.length - 1].midi
  };
}

function findPhrase(phraseLibrary, phraseId) {
  for (let index = 0; index < phraseLibrary.length; index += 1) {
    if (phraseLibrary[index].id === phraseId) {
      return phraseLibrary[index];
    }
  }
  return null;
}

function createVoiceNote(scalePitches, degree, chordTone) {
  const rootIndex = clamp(5 + degree, 0, scalePitches.length - 1);
  const toneOffsets = [0, 2, 4];
  return scalePitches[
    clamp(rootIndex + toneOffsets[chordTone % toneOffsets.length], 0, scalePitches.length - 1)
  ];
}

function createPhrasePattern(project, instrumentation, phraseProgression, scalePitches, random, options) {
  const pattern = [];
  const rowOffset = options.rowOffset || 0;
  const octaveShift = options.octaveShift || 0;
  const role = options.role || "part";

  for (let localBar = 0; localBar < phraseProgression.length; localBar += 1) {
    const degree = phraseProgression[localBar];
    const roleShift = getRoleOctaveShift(role, instrumentation.role);
    const voiceNote = createVoiceNote(
      scalePitches,
      degree,
      instrumentation.chordTone || 0
    ) + octaveShift * 12 + roleShift * 12;
    const shouldSplit = project.controls.complexity > 0.55 && random.chance(getRoleSplitChance(role));
    const baseLength = computeNoteLength(getRoleNoteLength(project.music.noteLength, role), shouldSplit);
    const entryRow = clamp(rowOffset + getRoleRowOffset(role, localBar), 0, 8);
    pattern.push({
      bar: localBar,
      row: entryRow,
      lengthRows: baseLength,
      midi: voiceNote
    });

    if (shouldSplit) {
      pattern.push({
        bar: localBar,
        row: clamp(8 + rowOffset + (role === "chorus" ? -1 : 0), 6, 12),
        lengthRows: Math.max(4, Math.round(baseLength * 0.5)),
        midi: findNeighborPitch(scalePitches, voiceNote, random)
      });
    }
  }

  return pattern;
}

function mutatePhrase(notes, mutationLevel, instrumentation, section, random) {
  return notes.map(function (note, index) {
    const next = {
      bar: note.bar,
      row: note.row,
      lengthRows: note.lengthRows,
      midi: note.midi
    };

    if (mutationLevel >= 1 && index > 0 && random.chance(0.3 + mutationLevel * 0.04)) {
      next.row = clamp(next.row + 1, 0, 12);
    }

    if (mutationLevel >= 2 && random.chance(0.4)) {
      next.lengthRows = clamp(next.lengthRows - 1, 4, 15);
    }

    if (mutationLevel >= 3 && random.chance(0.5)) {
      next.midi += random.chance(0.5) ? 2 : -2;
    }

    if (mutationLevel >= 4 && random.chance(0.35)) {
      next.midi += instrumentation.chordTone === 0 ? 12 : -12;
    }

    if (section.role === "intro") {
      next.lengthRows = Math.max(4, next.lengthRows - 2);
    } else if (section.role === "chorus") {
      next.lengthRows = clamp(next.lengthRows + 1, 4, 15);
      if (random.chance(0.35)) {
        next.midi += 12;
      }
    } else if (section.role === "bridge" && random.chance(0.4)) {
      next.midi += random.chance(0.5) ? 1 : -1;
    }

    return next;
  });
}

function computeMutationLevel(project, section, phraseIndex) {
  return phraseIndex
    + section.startBar / Math.max(1, section.phraseBars)
    + getRoleMutationBias(section.role)
    + project.controls.evolution * 3;
}

function findNeighborPitch(scalePitches, midi, random) {
  const idx = scalePitches.indexOf(midi);
  if (idx === -1) {
    return midi;
  }
  const move = random.chance(0.5) ? 1 : -1;
  return scalePitches[clamp(idx + move, 0, scalePitches.length - 1)];
}

function buildCandidateSet(baseMidi) {
  return [baseMidi - 12, baseMidi, baseMidi + 12];
}

function resolveVoiceLedPitch(previousMidi, candidates, preferredMidi) {
  if (previousMidi == null) {
    return preferredMidi;
  }

  let best = candidates[0];
  let bestScore = Infinity;

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    const score = Math.abs(candidate - previousMidi) + Math.abs(candidate - preferredMidi) * 0.2;
    if (score < bestScore) {
      best = candidate;
      bestScore = score;
    }
  }

  return best;
}

function applyCadence(notes, section, cadenceContext, primary, secondary, tertiary, localBar, random) {
  if (!cadenceContext || !cadenceContext.isLastBarInPhrase) {
    return;
  }

  if (section.role === "verse") {
    notes.push({
      bar: localBar,
      row: 13,
      lengthRows: 2,
      midi: cadenceContext.isLastPhraseInSection && cadenceContext.nextSectionRole === "chorus"
        ? tertiary
        : secondary
    });
    return;
  }

  if (section.role === "chorus") {
    notes.push({
      bar: localBar,
      row: 12,
      lengthRows: 3,
      midi: primary
    });
    return;
  }

  if (section.role === "bridge") {
    notes.push({
      bar: localBar,
      row: 12,
      lengthRows: 2,
      midi: random.chance(0.5) ? secondary : primary
    });
    if (cadenceContext.isLastPhraseInSection && cadenceContext.nextSectionRole === "chorus") {
      notes.push({
        bar: localBar,
        row: 14,
        lengthRows: 1,
        midi: tertiary
      });
    }
    return;
  }

  if (section.role === "intro" && cadenceContext.isLastPhraseInSection) {
    notes.push({
      bar: localBar,
      row: 12,
      lengthRows: 2,
      midi: secondary
    });
  }
}

function getRoleMutationBias(role) {
  if (role === "intro") return 0;
  if (role === "verse") return 1;
  if (role === "chorus") return 2;
  if (role === "bridge") return 3;
  return 1;
}

function getRoleNoteLength(noteLength, role, drama) {
  if (role === "intro") return Math.max(0.25, noteLength - 0.18);
  if (role === "chorus") return Math.min(1, noteLength + 0.08 + drama * 0.12);
  if (role === "bridge") return Math.max(0.25, noteLength - 0.08 + drama * 0.04);
  return noteLength;
}

function getRoleSplitChance(role) {
  if (role === "intro") return 0.25;
  if (role === "verse") return 0.45;
  if (role === "chorus") return 0.7;
  if (role === "bridge") return 0.55;
  return 0.45;
}

function getRoleRowOffset(role, localBar) {
  if (role === "intro") return localBar === 0 ? 2 : 1;
  if (role === "chorus") return localBar % 2 === 0 ? 0 : 1;
  if (role === "bridge") return 1;
  return 0;
}

function getRoleOctaveShift(role, trackRole, style) {
  if (role === "chorus" && trackRole !== "foundation") {
    return style === "dark" ? 0 : 1;
  }
  if (role === "intro" && trackRole === "foundation") return -1;
  if (style === "glassy" && trackRole !== "foundation") return 1;
  if (style === "dark" && trackRole === "glass") return -1;
  return 0;
}

function getStyleSplitBias(style) {
  if (style === "lush") return 0.12;
  if (style === "glassy") return 0.08;
  if (style === "organ") return -0.08;
  if (style === "dark") return -0.04;
  return 0;
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
