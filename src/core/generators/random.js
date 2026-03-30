import { createSeededRandom } from "../seeded-rng.js";
import { getScalePitches } from "../music-theory.js";

export function createRandomGenerator() {
  return {
    generate(project) {
      const random = createSeededRandom(project.seed);
      const bars = project.music.bars;
      const sectionPlan = createSectionPlan(random, project.music.scale, bars);
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

function createSectionPlan(random, scale, totalBars) {
  const phraseBars = totalBars >= 8 ? 2 : 1;
  const sectionBars = totalBars >= 12 ? 4 : totalBars;
  const baseProgression = createProgression(random, scale, totalBars);
  const sections = [];

  for (let bar = 0, sectionIndex = 0; bar < totalBars; bar += sectionBars, sectionIndex += 1) {
    const lengthBars = Math.min(sectionBars, totalBars - bar);
    sections.push({
      id: "section-" + sectionIndex,
      name: String.fromCharCode(65 + sectionIndex),
      startBar: bar,
      lengthBars: lengthBars,
      phraseBars: Math.min(phraseBars, lengthBars),
      progression: baseProgression.slice(bar, bar + lengthBars)
    });
  }

  return { sections: sections };
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

  sectionPlan.sections.forEach(function (section) {
    const sectionPhrases = createSectionPhrases(
      project,
      instrumentation,
      section,
      scalePitches,
      phraseFamily,
      phraseLibrary,
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
        rowOffset: index === 1 ? 1 : 0
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
  random
) {
  const phraseId = [
    instrumentation.role,
    section.id,
    "phrase",
    phraseIndex
  ].join("-");
  const notes = project.mode === "phrase"
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
  const mutationLevel = computeMutationLevel(section, phraseIndex);
  const notes = mutatePhrase(basePhrase.notes, mutationLevel, instrumentation, random);

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

  for (let localBar = 0; localBar < phraseProgression.length; localBar += 1) {
    const degree = phraseProgression[localBar];
    const voiceNote = createVoiceNote(scalePitches, degree, instrumentation.chordTone || 0) + octaveShift * 12;
    const shouldSplit = project.controls.complexity > 0.55 && random.chance(0.5);
    const baseLength = computeNoteLength(project.music.noteLength, shouldSplit);
    pattern.push({
      bar: localBar,
      row: clamp(rowOffset, 0, 6),
      lengthRows: baseLength,
      midi: voiceNote
    });

    if (shouldSplit) {
      pattern.push({
        bar: localBar,
        row: 8 + rowOffset,
        lengthRows: Math.max(4, Math.round(baseLength * 0.5)),
        midi: findNeighborPitch(scalePitches, voiceNote, random)
      });
    }
  }

  return pattern;
}

function mutatePhrase(notes, mutationLevel, instrumentation, random) {
  return notes.map(function (note, index) {
    const next = {
      bar: note.bar,
      row: note.row,
      lengthRows: note.lengthRows,
      midi: note.midi
    };

    if (mutationLevel >= 1 && index > 0 && random.chance(0.45)) {
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

    return next;
  });
}

function computeMutationLevel(section, phraseIndex) {
  return phraseIndex + section.startBar / Math.max(1, section.phraseBars);
}

function findNeighborPitch(scalePitches, midi, random) {
  const idx = scalePitches.indexOf(midi);
  if (idx === -1) {
    return midi;
  }
  const move = random.chance(0.5) ? 1 : -1;
  return scalePitches[clamp(idx + move, 0, scalePitches.length - 1)];
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
