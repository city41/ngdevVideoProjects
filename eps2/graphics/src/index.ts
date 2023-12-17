type SS2Data = {
  frameCountSpeed: number;
  palettes: Record<number, number[]>;
  spriteMemory: number[];
};

// spriteMemory is in bytes
const WORD_SIZE = 2;

async function main() {
  const ss2Data = require("./ss2.json") as SS2Data;

  for (let i = 0; i < 3; ++i) {
    // each entry in SCB1 is two words
    const entry = ss2Data.spriteMemory.slice(
      i * WORD_SIZE * 2,
      (i + 1) * WORD_SIZE * 2
    );

    const tileNumber = ((entry[3] & 0xf0) << 16) | (entry[1] << 8) | entry[0];
    const palette = entry[2];
    const verticalFlip = !!(entry[2] & 0x2);
    const horizontalFlip = !!(entry[2] & 0x1);

    console.log({ tileNumber, palette, verticalFlip, horizontalFlip });
  }
}

main()
  .then(() => {
    console.log("done");
  })
  .catch((e) => {
    console.error(e);
  });

export {};
