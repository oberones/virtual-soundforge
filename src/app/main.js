import {
  createProjectFromForm,
  projectToSummary
} from "../core/project.js";
import { createRandomGenerator } from "../core/generators/random.js";
import {
  renderCompositionToLoop,
  renderCompositionToWave
} from "../core/render/simple-synth.js";
import { renderCompositionToMidi } from "../core/render/midi-export.js";
import { saveLatestSnapshot } from "../core/storage/session.js";

const LIVE_UPDATE_DELAY_MS = 180;
const FADE_SECONDS = 0.06;

const state = {
  project: null,
  composition: null,
  audioContext: null,
  currentSource: null,
  currentGain: null,
  isPlaying: false,
  liveUpdateTimer: null,
  renderRevision: 0
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
    ? "Looping live. Adjust the controls to hear changes in place."
    : "Press Start Loop to begin continuous playback. Changing controls will update the next loop live.";
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

async function ensureAudioContext() {
  if (!state.audioContext) {
    state.audioContext = new window.AudioContext();
  }

  if (state.audioContext.state === "suspended") {
    await state.audioContext.resume();
  }

  return state.audioContext;
}

function createAudioBufferFromLoop(context, composition) {
  const stereo = renderCompositionToLoop(composition);
  const frameCount = stereo.left.length;
  const buffer = context.createBuffer(2, frameCount, stereo.sampleRate);
  buffer.copyToChannel(stereo.left, 0);
  buffer.copyToChannel(stereo.right, 1);
  return buffer;
}

function fadeOutCurrentSource(context) {
  if (!state.currentSource || !state.currentGain) {
    return;
  }

  const stopAt = context.currentTime + FADE_SECONDS;
  state.currentGain.gain.cancelScheduledValues(context.currentTime);
  state.currentGain.gain.setValueAtTime(state.currentGain.gain.value, context.currentTime);
  state.currentGain.gain.linearRampToValueAtTime(0.0001, stopAt);
  state.currentSource.stop(stopAt + 0.01);
  state.currentSource = null;
  state.currentGain = null;
}

function swapLoopSource(buffer) {
  const context = state.audioContext;
  const now = context.currentTime;
  const startAt = now + 0.01;
  const source = context.createBufferSource();
  const gain = context.createGain();

  source.buffer = buffer;
  source.loop = true;
  source.loopStart = 0;
  source.loopEnd = buffer.duration;
  gain.gain.setValueAtTime(0.0001, startAt);

  source.connect(gain);
  gain.connect(context.destination);
  source.start(startAt);
  gain.gain.exponentialRampToValueAtTime(1, startAt + FADE_SECONDS);

  if (state.currentSource && state.currentGain) {
    const oldSource = state.currentSource;
    const oldGain = state.currentGain;
    oldGain.gain.cancelScheduledValues(now);
    oldGain.gain.setValueAtTime(Math.max(0.0001, oldGain.gain.value), now);
    oldGain.gain.exponentialRampToValueAtTime(0.0001, now + FADE_SECONDS);
    oldSource.stop(now + FADE_SECONDS + 0.01);
  }

  state.currentSource = source;
  state.currentGain = gain;
}

async function refreshLiveLoop(statusMessage) {
  if (!state.composition || !state.isPlaying) {
    return;
  }

  const revision = state.renderRevision + 1;
  state.renderRevision = revision;
  const context = await ensureAudioContext();
  setStatus(statusMessage || "Updating live loop...");

  window.setTimeout(function () {
    if (revision !== state.renderRevision || !state.isPlaying) {
      return;
    }

    const buffer = createAudioBufferFromLoop(context, state.composition);
    swapLoopSource(buffer);
    setStatus("Live loop updated.");
  }, 0);
}

function scheduleLiveUpdate() {
  window.clearTimeout(state.liveUpdateTimer);
  state.liveUpdateTimer = window.setTimeout(function () {
    generateComposition();
    if (state.isPlaying) {
      refreshLiveLoop("Regenerating loop...");
    } else {
      setStatus("Parameters updated. Press Start Loop to hear the new pattern.");
    }
  }, LIVE_UPDATE_DELAY_MS);
}

async function toggleLoopPlayback() {
  if (state.isPlaying) {
    stopLoopPlayback();
    return;
  }

  if (!state.composition) {
    generateComposition();
  }

  await ensureAudioContext();
  state.isPlaying = true;
  updateTransportUi();
  refreshLiveLoop("Starting live loop...");
}

function stopLoopPlayback() {
  if (!state.audioContext) {
    state.isPlaying = false;
    updateTransportUi();
    setStatus("Loop stopped.");
    return;
  }

  state.isPlaying = false;
  state.renderRevision += 1;
  fadeOutCurrentSource(state.audioContext);
  updateTransportUi();
  setStatus("Loop stopped.");
}

function generateNow() {
  window.clearTimeout(state.liveUpdateTimer);
  generateComposition();
  if (state.isPlaying) {
    refreshLiveLoop("Regenerating loop...");
  } else {
    setStatus("Composition regenerated.");
  }
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
  const value = Math.random().toString(36).slice(2, 10);
  elements.seed.value = value;
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
setStatus("Ready for live looping.");
