import {
  createProjectFromForm,
  projectToSummary
} from "../core/project.js";
import { createRandomGenerator } from "../core/generators/random.js";
import { renderCompositionToWave } from "../core/render/simple-synth.js";
import { saveLatestSnapshot } from "../core/storage/session.js";

const state = {
  project: null,
  composition: null,
  wave: null,
  objectUrl: null
};

const elements = {
  mode: document.getElementById("mode"),
  key: document.getElementById("key"),
  scale: document.getElementById("scale"),
  tempo: document.getElementById("tempo"),
  bars: document.getElementById("bars"),
  formStyle: document.getElementById("formStyle"),
  voices: document.getElementById("voices"),
  noteLength: document.getElementById("noteLength"),
  seed: document.getElementById("seed"),
  density: document.getElementById("density"),
  complexity: document.getElementById("complexity"),
  variation: document.getElementById("variation"),
  drama: document.getElementById("drama"),
  evolution: document.getElementById("evolution"),
  generateButton: document.getElementById("generateButton"),
  shuffleSeedButton: document.getElementById("shuffleSeedButton"),
  playButton: document.getElementById("playButton"),
  exportButton: document.getElementById("exportButton"),
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
    formStyle: elements.formStyle.value,
    voices: Number(elements.voices.value),
    noteLength: Number(elements.noteLength.value) / 100,
    seed: elements.seed.value.trim(),
    density: Number(elements.density.value) / 100,
    complexity: Number(elements.complexity.value) / 100,
    variation: Number(elements.variation.value) / 100,
    drama: Number(elements.drama.value) / 100,
    evolution: Number(elements.evolution.value) / 100
  };
}

function updateUi() {
  if (!state.project || !state.composition) {
    return;
  }

  const summary = projectToSummary(state.project, state.composition);
  saveLatestSnapshot({
    summary: summary,
    debug: state.composition.debug,
    generatedAt: new Date().toISOString()
  });
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
  state.wave = null;

  updateUi();
  setStatus("Composition generated. Ready to render.");
}

function renderComposition(done) {
  if (!state.composition) {
    generateComposition();
  }

  setStatus("Rendering audio...");
  window.setTimeout(function () {
    state.wave = renderCompositionToWave(state.composition);
    renderAudioWave();
    setStatus("Render complete.");
    if (done) {
      done();
    }
  }, 0);
}

function playSong() {
  renderComposition(function () {
    elements.audio.currentTime = 0;
    elements.audio.play();
  });
}

function exportWave() {
  renderComposition(function () {
    const link = document.createElement("a");
    link.href = state.objectUrl;
    link.download = "generative-harmony.wav";
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
