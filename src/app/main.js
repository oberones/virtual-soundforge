import {
  createProjectFromForm,
  projectToSummary
} from "../core/project.js";
import { createRandomGenerator } from "../core/generators/random.js";
import { compositionToSoundBoxSong } from "../core/adapter/soundbox.js";

const state = {
  project: null,
  composition: null,
  song: null,
  wave: null,
  player: null,
  objectUrl: null
};

const elements = {
  mode: document.getElementById("mode"),
  key: document.getElementById("key"),
  scale: document.getElementById("scale"),
  tempo: document.getElementById("tempo"),
  bars: document.getElementById("bars"),
  voices: document.getElementById("voices"),
  noteLength: document.getElementById("noteLength"),
  seed: document.getElementById("seed"),
  density: document.getElementById("density"),
  complexity: document.getElementById("complexity"),
  variation: document.getElementById("variation"),
  generateButton: document.getElementById("generateButton"),
  shuffleSeedButton: document.getElementById("shuffleSeedButton"),
  playButton: document.getElementById("playButton"),
  exportButton: document.getElementById("exportButton"),
  summary: document.getElementById("summary"),
  debug: document.getElementById("debug"),
  audio: document.getElementById("audio"),
  status: document.getElementById("status")
};

function setStatus(message) {
  elements.status.textContent = message;
}

function readForm() {
  return {
    mode: elements.mode.value,
    key: elements.key.value,
    scale: elements.scale.value,
    tempo: Number(elements.tempo.value),
    bars: Number(elements.bars.value),
    voices: Number(elements.voices.value),
    noteLength: Number(elements.noteLength.value) / 100,
    seed: elements.seed.value.trim(),
    density: Number(elements.density.value) / 100,
    complexity: Number(elements.complexity.value) / 100,
    variation: Number(elements.variation.value) / 100
  };
}

function updateUi() {
  elements.summary.textContent = state.project && state.composition
    ? projectToSummary(state.project, state.composition)
    : "No composition generated yet.";

  elements.debug.textContent = state.composition
    ? JSON.stringify(state.composition.debug, null, 2)
    : "Waiting for generation.";
}

function renderAudioWave() {
  if (!state.wave) {
    return;
  }

  if (state.objectUrl) {
    URL.revokeObjectURL(state.objectUrl);
  }

  const blob = new Blob([state.wave], { type: "audio/wav" });
  state.objectUrl = URL.createObjectURL(blob);
  elements.audio.src = state.objectUrl;
}

function generateComposition() {
  const form = readForm();
  state.project = createProjectFromForm(form);

  const generator = createRandomGenerator();
  state.composition = generator.generate(state.project);
  state.song = compositionToSoundBoxSong(state.composition);
  state.wave = null;

  updateUi();
  setStatus("Composition generated. Ready to render.");
}

function renderSong(done) {
  if (!state.song) {
    generateComposition();
  }

  setStatus("Rendering audio...");
  state.player = new CPlayer();
  state.player.generate(state.song, null, function (progress) {
    if (progress >= 1) {
      state.wave = state.player.createWave();
      renderAudioWave();
      setStatus("Render complete.");
      if (done) {
        done();
      }
    } else {
      setStatus("Rendering audio... " + Math.round(progress * 100) + "%");
    }
  });
}

function playSong() {
  renderSong(function () {
    elements.audio.currentTime = 0;
    elements.audio.play();
  });
}

function exportWave() {
  renderSong(function () {
    const link = document.createElement("a");
    link.href = state.objectUrl;
    link.download = "soundbox-generative.wav";
    link.click();
  });
}

function randomSeed() {
  const value = Math.random().toString(36).slice(2, 10);
  elements.seed.value = value;
  generateComposition();
}

elements.generateButton.addEventListener("click", generateComposition);
elements.shuffleSeedButton.addEventListener("click", randomSeed);
elements.playButton.addEventListener("click", playSong);
elements.exportButton.addEventListener("click", exportWave);

generateComposition();
