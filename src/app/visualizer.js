const MAX_NOTE_LIFE_MS = 5000;

export function createVisualizer(canvas, playback) {
  const context = canvas.getContext("2d");
  const state = {
    notes: [],
    rafId: null,
    dpr: 1,
    width: 0,
    height: 0
  };

  if (!context) {
    return {
      onNoteScheduled() {},
      start() {},
      stop() {},
      renderOnce() {}
    };
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const width = Math.max(320, Math.round(rect.width || canvas.width));
    const height = Math.max(180, Math.round(rect.height || canvas.height));

    if (state.width === width && state.height === height && state.dpr === dpr) {
      return;
    }

    state.width = width;
    state.height = height;
    state.dpr = dpr;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function onNoteScheduled(event) {
    const now = performance.now();
    state.notes.push({
      midi: event.midi,
      trackIndex: event.trackIndex,
      trackRole: event.trackRole,
      startedAtMs: now,
      endsAtMs: now + event.durationRows * event.rowDuration * 1000,
      scheduledAt: event.startTime,
      durationMs: event.durationRows * event.rowDuration * 1000,
      brightness: 0.45 + event.voice.brightness * 0.9,
      pan: event.voice.pan
    });

    if (state.notes.length > 90) {
      state.notes.splice(0, state.notes.length - 90);
    }
  }

  function start() {
    if (state.rafId != null) {
      return;
    }

    resize();
    renderFrame();
    window.addEventListener("resize", resize);
  }

  function stop() {
    if (state.rafId != null) {
      window.cancelAnimationFrame(state.rafId);
      state.rafId = null;
    }
    window.removeEventListener("resize", resize);
  }

  function renderOnce() {
    resize();
    paint();
  }

  function renderFrame() {
    paint();
    state.rafId = window.requestAnimationFrame(renderFrame);
  }

  function paint() {
    resize();

    const width = state.width;
    const height = state.height;
    const nowMs = performance.now();
    const visualState = playback.getVisualState ? playback.getVisualState() : null;
    const energy = visualState ? computeEnergy(visualState.frequency) : 0.08;
    const shimmer = visualState ? computeShimmer(visualState.timeDomain) : 0.06;
    const hueOffset = playback.isRunning && playback.isRunning() ? 0 : -10;

    context.clearRect(0, 0, width, height);
    paintBackdrop(width, height, energy, shimmer, hueOffset);
    paintGrid(width, height, energy);
    paintNotes(width, height, nowMs, energy);
    paintWaveform(width, height, visualState ? visualState.timeDomain : null, energy);
  }

  function paintBackdrop(width, height, energy, shimmer, hueOffset) {
    const gradient = context.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "rgba(18, 14, 30, 0.95)");
    gradient.addColorStop(1, "rgba(10, 9, 16, 0.98)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);

    const orb = context.createRadialGradient(
      width * 0.5,
      height * 0.24,
      20,
      width * 0.5,
      height * 0.24,
      width * 0.48
    );
    orb.addColorStop(0, "rgba(139, 92, 246," + (0.12 + energy * 0.18) + ")");
    orb.addColorStop(0.45, "rgba(56, 189, 248," + (0.06 + shimmer * 0.12) + ")");
    orb.addColorStop(1, "rgba(10, 9, 16, 0)");
    context.fillStyle = orb;
    context.fillRect(0, 0, width, height);

    context.strokeStyle = "hsla(" + (248 + hueOffset) + ", 74%, 72%, 0.06)";
    context.lineWidth = 1;
    context.strokeRect(0.5, 0.5, width - 1, height - 1);
  }

  function paintGrid(width, height, energy) {
    context.strokeStyle = "rgba(255, 255, 255, " + (0.04 + energy * 0.05) + ")";
    context.lineWidth = 1;

    for (let lane = 1; lane < 6; lane += 1) {
      const y = (height / 6) * lane;
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y);
      context.stroke();
    }
  }

  function paintNotes(width, height, nowMs, energy) {
    const minMidi = 36;
    const maxMidi = 96;
    state.notes = state.notes.filter(function (note) {
      return nowMs - note.endsAtMs < MAX_NOTE_LIFE_MS;
    });

    state.notes.forEach(function (note) {
      const totalLife = Math.max(220, note.durationMs + 1400);
      const age = nowMs - note.startedAtMs;
      const fade = clamp(1 - age / totalLife, 0, 1);
      if (fade <= 0) {
        return;
      }

      const progress = clamp(age / Math.max(400, totalLife), 0, 1);
      const x = width * (0.14 + progress * 0.78);
      const pitchAmount = clamp((note.midi - minMidi) / (maxMidi - minMidi), 0, 1);
      const y = height - pitchAmount * height * 0.82 - height * 0.09;
      const radius = 8 + note.brightness * 7 + energy * 10;
      const hue = getRoleHue(note.trackRole);
      const alpha = fade * (0.2 + note.brightness * 0.45);

      context.beginPath();
      context.strokeStyle = "hsla(" + hue + ", 85%, 72%, " + alpha * 0.55 + ")";
      context.lineWidth = Math.max(1.5, radius * 0.42);
      context.moveTo(Math.max(0, x - radius * 5.5), y);
      context.lineTo(x, y);
      context.stroke();

      const glow = context.createRadialGradient(x, y, 0, x, y, radius * 2.5);
      glow.addColorStop(0, "hsla(" + hue + ", 95%, 76%, " + alpha + ")");
      glow.addColorStop(0.45, "hsla(" + hue + ", 95%, 65%, " + alpha * 0.65 + ")");
      glow.addColorStop(1, "hsla(" + hue + ", 95%, 60%, 0)");
      context.fillStyle = glow;
      context.beginPath();
      context.arc(x, y, radius * 2.5, 0, Math.PI * 2);
      context.fill();

      context.fillStyle = "hsla(" + hue + ", 96%, 84%, " + alpha * 0.95 + ")";
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    });
  }

  function paintWaveform(width, height, timeDomain, energy) {
    const baseline = height * 0.86;

    context.beginPath();
    context.strokeStyle = "rgba(56, 189, 248, " + (0.18 + energy * 0.26) + ")";
    context.lineWidth = 2;

    if (!timeDomain || timeDomain.length === 0) {
      context.moveTo(0, baseline);
      context.lineTo(width, baseline);
      context.stroke();
      return;
    }

    for (let index = 0; index < timeDomain.length; index += 1) {
      const x = (index / (timeDomain.length - 1)) * width;
      const centered = (timeDomain[index] - 128) / 128;
      const y = baseline + centered * height * 0.08;
      if (index === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    }
    context.stroke();
  }

  return {
    onNoteScheduled: onNoteScheduled,
    start: start,
    stop: stop,
    renderOnce: renderOnce
  };
}

function computeEnergy(frequency) {
  if (!frequency || !frequency.length) {
    return 0.06;
  }

  let total = 0;
  const sampleCount = Math.min(48, frequency.length);
  for (let index = 0; index < sampleCount; index += 1) {
    total += frequency[index];
  }
  return clamp(total / (sampleCount * 255), 0, 1);
}

function computeShimmer(timeDomain) {
  if (!timeDomain || !timeDomain.length) {
    return 0.04;
  }

  let total = 0;
  for (let index = 1; index < timeDomain.length; index += 1) {
    total += Math.abs(timeDomain[index] - timeDomain[index - 1]);
  }
  return clamp(total / (timeDomain.length * 22), 0, 1);
}

function getRoleHue(role) {
  if (role === "foundation") return 262;
  if (role === "body") return 286;
  if (role === "air") return 196;
  if (role === "shimmer") return 178;
  if (role === "halo") return 320;
  if (role === "glass") return 205;
  return 252;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
