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
          sectionPlan: sectionPlan.sections.map(function (section) {
            return {
              id: section.id,
              progression: section.progression,
              phraseBars: section.phraseBars
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
  sectionPlan.sections.forEach(function (section) {
    const sectionPhrases = createSectionPhrases(
      project,
      instrumentation,
      section,
      scalePitches,
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
    phrases: phrases,
    notes: notes
  };
}

function createSectionPhrases(project, instrumentation, section, scalePitches, phraseLibrary, random) {
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
  phraseLibrary,
  random
) {
  const notes = [];
  for (let localBar = 0; localBar < phraseProgression.length; localBar += 1) {
    notes.push.apply(
      notes,
      createHarmonicBar(project, instrumentation, phraseProgression[localBar], localBar, scalePitches, random)
    );
  }

  const phraseId = [
    instrumentation.role,
    section.id,
    "phrase",
    phraseIndex
  ].join("-");

  phraseLibrary.push({
    id: phraseId,
    role: instrumentation.role,
    sectionId: section.id,
    lengthBars: phraseLengthBars,
    notes: notes
  });

  return phraseId;
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
