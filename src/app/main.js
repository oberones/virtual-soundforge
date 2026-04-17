import {
  createProjectFromForm,
  projectToSummary
} from "../core/project.js";
import { createRandomGenerator } from "../core/generators/random.js";
import { renderCompositionToWave } from "../core/render/simple-synth.js";
import { renderCompositionToMidi } from "../core/render/midi-export.js";
import { createLivePlaybackEngine } from "../core/render/live-synth.js";
import { saveLatestSnapshot } from "../core/storage/session.js";

const LIVE_UPDATE_DELAY_MS = 140;

const state = {
  project: null,
  composition: null,
  isPlaying: false,
  liveUpdateTimer: null,
  playback: createLivePlaybackEngine()
};

const elements = {
  mode: document.getElementById("mode"),
  key: document.getElementById("key"),
  scale: document.getElementById("scale"),
  tempo: document.getElementById("tempo"),
  bars: document.getElementById("bars"),
  formStyle: document.getElementById("formStyle"),
  style: document.getElementById("style"),
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
  exportMidiButton: document.getElementById("exportMidiButton"),
  transportHint: document.getElementById("transportHint"),
  status: document.getElementById("status")
};

const liveInputs = [
  elements.mode,
  elements.key,
  elements.scale,
  elements.tempo,
  elements.bars,
  elements.formStyle,
  elements.style,
  elements.voices,
  elements.noteLength,
  elements.seed,
  elements.density,
  elements.complexity,
  elements.variation,
  elements.drama,
  elements.evolution
];

function setStatus(message) {
  elements.status.textContent = message;
}

function updateTransportUi() {
  elements.playButton.textContent = state.isPlaying ? "Stop Loop" : "Start Loop";
  elements.transportHint.textContent = state.isPlaying
    ? "Looping live. Changing settings now updates the upcoming notes without restarting the transport."
    : "Press Start Loop to begin continuous playback. Once running, control changes will reshape the upcoming notes live.";
}

function readForm() {
  return {
    mode: elements.mode.value,
    key: elements.key.value,
    scale: elements.scale.value,
    tempo: Number(elements.tempo.value),
    bars: Number(elements.bars.value),
    formStyle: elements.formStyle.value,
    style: elements.style.value,
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

function generateComposition() {
  const form = readForm();
  state.project = createProjectFromForm(form);
  state.composition = createRandomGenerator().generate(state.project);
  updateUi();
}

function clearLiveUpdateTimer() {
  if (state.liveUpdateTimer != null) {
    window.clearTimeout(state.liveUpdateTimer);
    state.liveUpdateTimer = null;
  }
}

function applyLiveUpdate(source) {
  generateComposition();

  if (state.isPlaying) {
    state.playback.updateComposition(state.composition);
    setStatus(source === "manual"
      ? "Composition updated. Upcoming notes now use the new settings."
      : "Live changes applied. Upcoming notes now reflect the new settings.");
  } else {
    setStatus(source === "manual"
      ? "Composition regenerated."
      : "Parameters updated. Press Start Loop to hear the new pattern.");
  }
}

function scheduleLiveUpdate() {
  clearLiveUpdateTimer();
  state.liveUpdateTimer = window.setTimeout(function () {
    state.liveUpdateTimer = null;
    applyLiveUpdate("auto");
  }, LIVE_UPDATE_DELAY_MS);
}

async function toggleLoopPlayback() {
  if (state.isPlaying) {
    stopLoopPlayback();
    return;
  }

  clearLiveUpdateTimer();
  if (!state.composition) {
    generateComposition();
  }

  const started = await state.playback.start(state.composition);
  if (!started) {
    setStatus("Nothing to play yet.");
    return;
  }

  state.isPlaying = true;
  updateTransportUi();
  setStatus("Transport running. Upcoming notes will update live as you change the controls.");
}

function stopLoopPlayback() {
  clearLiveUpdateTimer();
  state.playback.stop();
  state.isPlaying = false;
  updateTransportUi();
  setStatus("Loop stopped.");
}

function generateNow() {
  clearLiveUpdateTimer();
  applyLiveUpdate("manual");
}

function exportWave() {
  if (!state.composition) {
    generateComposition();
  }

  const wave = renderCompositionToWave(state.composition);
  const blob = new Blob([wave], { type: "audio/wav" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "generative-harmony.wav";
  link.click();
  window.setTimeout(function () {
    URL.revokeObjectURL(url);
  }, 1000);
}

function exportMidi() {
  if (!state.composition) {
    generateComposition();
  }

  const midi = renderCompositionToMidi(state.composition);
  const blob = new Blob([midi], { type: "audio/midi" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "generative-harmony.mid";
  link.click();
  window.setTimeout(function () {
    URL.revokeObjectURL(url);
  }, 1000);
}

function randomSeed() {
  elements.seed.value = Math.random().toString(36).slice(2, 10);
  generateNow();
}

liveInputs.forEach(function (input) {
  input.addEventListener("input", scheduleLiveUpdate);
  input.addEventListener("change", scheduleLiveUpdate);
});

elements.generateButton.addEventListener("click", generateNow);
elements.shuffleSeedButton.addEventListener("click", randomSeed);
elements.playButton.addEventListener("click", toggleLoopPlayback);
elements.exportButton.addEventListener("click", exportWave);
elements.exportMidiButton.addEventListener("click", exportMidi);

generateComposition();
updateTransportUi();
setStatus("Ready for live transport playback.");
