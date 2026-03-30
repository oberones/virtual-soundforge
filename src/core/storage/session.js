const SNAPSHOT_KEY = "virtual-soundforge.latest-snapshot";

export function saveLatestSnapshot(snapshot) {
  try {
    window.sessionStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch (error) {
    console.warn("Unable to persist composition snapshot.", error);
  }
}

export function loadLatestSnapshot() {
  try {
    const value = window.sessionStorage.getItem(SNAPSHOT_KEY);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.warn("Unable to load composition snapshot.", error);
    return null;
  }
}
