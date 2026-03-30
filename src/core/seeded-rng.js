export function createSeededRandom(seedText) {
  let seed = 2166136261;
  const text = String(seedText || "soundbox");

  for (let index = 0; index < text.length; index += 1) {
    seed ^= text.charCodeAt(index);
    seed = Math.imul(seed, 16777619);
  }

  return {
    next() {
      seed += 0x6d2b79f5;
      let t = seed;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    },
    int(min, max) {
      return Math.floor(this.float(min, max + 1));
    },
    float(min, max) {
      return min + (max - min) * this.next();
    },
    pick(list) {
      return list[this.int(0, list.length - 1)];
    },
    chance(probability) {
      return this.next() < probability;
    }
  };
}
