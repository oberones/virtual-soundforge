import { loadLatestSnapshot } from "../core/storage/session.js";

const elements = {
  summary: document.getElementById("summary"),
  debug: document.getElementById("debug")
};

function renderSnapshot() {
  const snapshot = loadLatestSnapshot();
  if (!snapshot) {
    return;
  }

  elements.summary.textContent = snapshot.summary || "No summary available.";
  elements.debug.textContent = snapshot.debug
    ? JSON.stringify(snapshot.debug, null, 2)
    : "No generation log available.";
}

renderSnapshot();
