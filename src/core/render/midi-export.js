const PPQ = 480;
const ROW_TICKS = PPQ / 4;

export function renderCompositionToMidi(composition) {
  const tracks = [];

  tracks.push(createMetaTrack(composition));
  composition.tracks.forEach(function (track, index) {
    tracks.push(createNoteTrack(track, index, composition.rowsPerPattern));
  });

  const header = createHeaderChunk(tracks.length);
  const chunks = [header].concat(tracks);
  const size = chunks.reduce(function (total, chunk) {
    return total + chunk.length;
  }, 0);

  const output = new Uint8Array(size);
  let offset = 0;
  chunks.forEach(function (chunk) {
    output.set(chunk, offset);
    offset += chunk.length;
  });

  return output;
}

function createMetaTrack(composition) {
  const bytes = [];
  const tempoMicros = Math.round(60000000 / composition.tempo);

  pushVarLen(bytes, 0);
  bytes.push(0xff, 0x51, 0x03);
  bytes.push((tempoMicros >> 16) & 255, (tempoMicros >> 8) & 255, tempoMicros & 255);

  pushVarLen(bytes, 0);
  bytes.push(0xff, 0x58, 0x04, 4, 2, 24, 8);

  pushVarLen(bytes, 0);
  bytes.push(0xff, 0x2f, 0x00);

  return createTrackChunk(bytes);
}

function createNoteTrack(track, trackIndex, rowsPerPattern) {
  const channel = trackIndex % 16;
  const events = [];

  events.push({
    tick: 0,
    type: "meta-name",
    text: track.instrument.presetName || track.role
  });

  events.push({
    tick: 0,
    type: "program",
    channel: channel,
    program: trackIndex % 8
  });

  track.notes.forEach(function (note) {
    const startTick = Math.round((note.bar * rowsPerPattern + note.row) * ROW_TICKS);
    const lengthTicks = Math.max(60, Math.round(note.lengthRows * ROW_TICKS));
    events.push({
      tick: startTick,
      type: "on",
      channel: channel,
      note: clampMidi(note.midi),
      velocity: 92
    });
    events.push({
      tick: startTick + lengthTicks,
      type: "off",
      channel: channel,
      note: clampMidi(note.midi),
      velocity: 0
    });
  });

  events.sort(compareEvents);

  const bytes = [];
  let previousTick = 0;

  events.forEach(function (event) {
    pushVarLen(bytes, event.tick - previousTick);
    previousTick = event.tick;

    if (event.type === "meta-name") {
      const text = stringToBytes(event.text);
      bytes.push(0xff, 0x03);
      pushVarLen(bytes, text.length);
      bytes.push.apply(bytes, text);
      return;
    }

    if (event.type === "program") {
      bytes.push(0xc0 | event.channel, event.program);
      return;
    }

    if (event.type === "on") {
      bytes.push(0x90 | event.channel, event.note, event.velocity);
      return;
    }

    bytes.push(0x80 | event.channel, event.note, event.velocity);
  });

  pushVarLen(bytes, 0);
  bytes.push(0xff, 0x2f, 0x00);

  return createTrackChunk(bytes);
}

function compareEvents(left, right) {
  if (left.tick !== right.tick) {
    return left.tick - right.tick;
  }

  const order = {
    "meta-name": 0,
    program: 1,
    off: 2,
    on: 3
  };

  return order[left.type] - order[right.type];
}

function createHeaderChunk(trackCount) {
  const bytes = [];
  bytes.push(77, 84, 104, 100);
  bytes.push(0, 0, 0, 6);
  bytes.push(0, 1);
  bytes.push((trackCount >> 8) & 255, trackCount & 255);
  bytes.push((PPQ >> 8) & 255, PPQ & 255);
  return new Uint8Array(bytes);
}

function createTrackChunk(dataBytes) {
  const length = dataBytes.length;
  const bytes = [
    77, 84, 114, 107,
    (length >> 24) & 255,
    (length >> 16) & 255,
    (length >> 8) & 255,
    length & 255
  ];

  bytes.push.apply(bytes, dataBytes);
  return new Uint8Array(bytes);
}

function pushVarLen(bytes, value) {
  let buffer = value & 127;
  while ((value >>= 7)) {
    buffer <<= 8;
    buffer |= ((value & 127) | 128);
  }

  while (true) {
    bytes.push(buffer & 255);
    if (buffer & 128) {
      buffer >>= 8;
    } else {
      break;
    }
  }
}

function stringToBytes(text) {
  return Array.from(String(text || "")).map(function (character) {
    return character.charCodeAt(0) & 127;
  });
}

function clampMidi(value) {
  return Math.min(127, Math.max(0, Math.round(value)));
}
