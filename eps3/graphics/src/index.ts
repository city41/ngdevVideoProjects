import { createCanvas, Image } from "canvas";
import * as fs from "fs";
import {
  renderFixTileToCanvas,
  renderSpriteTileToCanvas,
  RgbPalette,
} from "./renderTileToCanvas";
import { convertNeoGeoPaletteToRGB } from "./convertNeoGeoPaletteToRGB";

type SS2Data = {
  frameCountSpeed: number;
  palettes: Record<number, number[]>;
  spriteMemory: number[];
  tileMemory: Record<number, number[]>;
};

// Address of Sprite Control Block in VRAM, using word addressing
const ADDR_SCB1 = 0;
const SCB1_SIZE = 0x7000;
const ADDR_SCB3 = 0x8200;
const ADDR_SCB4 = 0x8400;

const FIX_START = 0x7000;
const FIX_SIZE = 0x1000;

export const SCB234_SIZE = ADDR_SCB4 - ADDR_SCB3;
// how many words one sprite entry in SCB1 takes up
const SCB1_SPRITE_ENTRY_SIZE = 64;

type SpriteTile = {
  paletteIndex: number;
  tileIndex: number;
  vFlip: boolean;
  hFlip: boolean;
};

type Sprite = {
  spriteIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  tiles: SpriteTile[][];
};

function getScb1Data(data: Uint16Array, spriteIndex: number): SpriteTile[] {
  const tiles: SpriteTile[] = [];
  for (let t = 0; t < SCB1_SPRITE_ENTRY_SIZE; t += 2) {
    const ti = spriteIndex * SCB1_SPRITE_ENTRY_SIZE + t;
    const tileLsb = data.at(ti);
    if (tileLsb === undefined) {
      throw new Error(`getScb1Data: index out of range: ${ti}`);
    }

    const tileOdd = data.at(ti + 1);

    if (tileOdd === undefined) {
      throw new Error(`getScb1Data: index out of range: ${ti + 1}`);
    }

    const paletteIndex = (tileOdd & 0xff00) >> 8;
    const tileMsb = (tileOdd & 0x00f0) >> 4;
    const vFlip = !!(tileOdd & 0x2);
    const hFlip = !!(tileOdd & 0x1);

    tiles.push({
      paletteIndex,
      hFlip,
      vFlip,
      tileIndex: (tileMsb << 16) | tileLsb,
    });
  }

  return tiles;
}

function getScb3Data(
  data: Uint16Array,
  spriteIndex: number
): { y: number; sticky: boolean; height: number } {
  const word = data.at(spriteIndex);

  if (word === undefined) {
    throw new Error(`getScb3Data: index out of range: ${spriteIndex}`);
  }

  return {
    height: word & 0x3f,
    sticky: !!(word & 0x40),
    y: word >> 7,
  };
}

function getScb4Data(data: Uint16Array, spriteIndex: number): { x: number } {
  const word = data.at(spriteIndex);

  if (word === undefined) {
    throw new Error(`getScb4Data: index out of range: ${spriteIndex}`);
  }

  return { x: word >> 6 };
}

function getSprite(
  scb1: Uint16Array,
  scb3: Uint16Array,
  scb4: Uint16Array,
  si: number,
  width: number
): Sprite {
  const { height, y } = getScb3Data(scb3, si);
  const { x } = getScb4Data(scb4, si);

  const tiles: SpriteTile[][] = [];

  for (let s = si; s < si + width; ++s) {
    const tileStrip = getScb1Data(scb1, s);
    tiles.push(tileStrip);
  }

  return {
    spriteIndex: si,
    width,
    height,
    x,
    y,
    tiles,
  };
}

function getSprites(
  scb1: Uint16Array,
  scb3: Uint16Array,
  scb4: Uint16Array
): Sprite[] {
  const sprites: Sprite[] = [];
  let si = 0;

  while (si < 381) {
    const spriteIndex = si;
    let width = 1;
    si += 1;

    while (si < 381) {
      if (getScb3Data(scb3, si).sticky) {
        width += 1;
        si += 1;
      } else {
        break;
      }
    }

    const sprite = getSprite(scb1, scb3, scb4, spriteIndex, width);

    sprites.push(sprite);
  }

  return sprites;
}

function spriteToBuffer(
  sprite: Sprite,
  palettes: Record<number, number[]>,
  tileDatas: Record<number, number[]>
): Buffer {
  const canvas = createCanvas(sprite.width * 16, sprite.height * 16);
  console.log("canvas.width", canvas.width, "height", canvas.height);
  const context = canvas.getContext("2d");

  for (let x = 0; x < sprite.width; ++x) {
    for (let y = 0; y < sprite.height; ++y) {
      const { tileIndex, paletteIndex, hFlip } = sprite.tiles[x][y];
      console.log(sprite.tiles[x][y]);
      const neoPalette = palettes[paletteIndex];
      if (!neoPalette) {
        throw new Error(`spriteToBuffer: no palette found at ${paletteIndex}`);
      }
      const tileData = tileDatas[tileIndex];

      if (!tileData) {
        throw new Error(`spriteToBugger: no tile data found at ${tileIndex}`);
      }
      const rgbPalette = convertNeoGeoPaletteToRGB(palettes[paletteIndex]);
      const tileCanvas = renderSpriteTileToCanvas(rgbPalette, tileData, hFlip);

      context.drawImage(tileCanvas, x * 16, y * 16);
    }
  }

  return canvas.toBuffer();
}

async function extractSprites(ss2Data: SS2Data) {
  console.log("spriteMemory.length", ss2Data.spriteMemory.length);
  console.log("vram word count", ADDR_SCB4 + SCB234_SIZE);

  const scb1 = new Uint16Array(
    new Uint8Array(
      ss2Data.spriteMemory.slice(ADDR_SCB1 * 2, SCB1_SIZE * 2)
    ).buffer
  );
  const scb3 = new Uint16Array(
    new Uint8Array(
      ss2Data.spriteMemory.slice(ADDR_SCB3 * 2, (ADDR_SCB3 + SCB234_SIZE) * 2)
    ).buffer
  );
  const scb4 = new Uint16Array(
    new Uint8Array(
      ss2Data.spriteMemory.slice(ADDR_SCB4 * 2, (ADDR_SCB4 + SCB234_SIZE) * 2)
    ).buffer
  );

  console.log("scb1.length", scb1.length);
  console.log("scb3.length", scb3.length);
  console.log("scb4.length", scb4.length);

  const sprites = getSprites(scb1, scb3, scb4);
  console.log("sprite count", sprites.length);

  sprites.forEach((s, i) => {
    if (s.width > 1) {
      console.log(
        `sprite (i:${i}) (si:${s.spriteIndex}), w:${s.width}, h:${s.height}`
      );
    }
  });

  const b = spriteToBuffer(sprites[64], ss2Data.palettes, ss2Data.tileMemory);
  fs.writeFileSync(`./sprite64.png`, b);

  const b2 = spriteToBuffer(sprites[66], ss2Data.palettes, ss2Data.tileMemory);
  fs.writeFileSync(`./sprite66.png`, b2);

  const b3 = spriteToBuffer(sprites[65], ss2Data.palettes, ss2Data.tileMemory);
  fs.writeFileSync(`./sprite65.png`, b3);

  console.log(
    "first strip paletteIndex",
    JSON.stringify(sprites[64].tiles[0].map((t) => t.paletteIndex))
  );
}

async function getFixPalettes(): Promise<RgbPalette[]> {
  return new Promise((resolve) => {
    const i = new Image();
    i.onload = () => {
      const c = createCanvas(i.width, i.height).getContext("2d");
      c.drawImage(i, 0, 0);

      const palettes: RgbPalette[] = [];

      for (let p = 0; p < 16; ++p) {
        const palette: RgbPalette = [[0, 0, 0, 0]];

        for (let x = 1; x < 16; ++x) {
          const imageData = c.getImageData(x, p, 1, 1);
          palette.push(
            Array.from(imageData.data) as [number, number, number, number]
          );
        }

        palettes.push(palette);
      }

      resolve(palettes);
    };

    i.src = "./palettes.png";
  });
}

async function extractFixLayer(ss2Data: SS2Data) {
  const s1 = Array.from(fs.readFileSync("./roms/063-s1.s1"));

  const fixPalettes = await getFixPalettes();

  const fixLayer = new Uint16Array(
    new Uint8Array(
      ss2Data.spriteMemory.slice(FIX_START * 2, (FIX_START + FIX_SIZE) * 2)
    ).buffer
  );

  console.log("fixLayer length", fixLayer.length);

  const fixCanvas = createCanvas(40 * 8, 32 * 8);
  const fixContext = fixCanvas.getContext("2d");

  for (let y = 0; y < 32; ++y) {
    const sss = [];
    for (let x = 0; x < 40; ++x) {
      const wordIndex = x * 32 + y;
      const word = fixLayer.at(wordIndex);

      if (word === undefined) {
        throw new Error(`Bad fix index at: ${wordIndex}`);
      }

      const tileIndex = word & 0xfff;
      const paletteIndex = word >> 12;

      const rgbPalette = fixPalettes[paletteIndex];
      const tileCanvas = renderFixTileToCanvas(s1, tileIndex, rgbPalette);
      fixContext.drawImage(tileCanvas, x * 8, y * 8);

      if (tileIndex === 0xff) {
        sss.push(" . ");
      } else {
        sss.push(tileIndex.toString(16));
      }
    }

    console.log(sss.join(" "));
  }

  const b = fixCanvas.toBuffer();
  fs.writeFileSync("./fixLayer.png", b);
}

async function main() {
  const ss2Data = require("./ss2.json") as SS2Data;

  await extractSprites(ss2Data);
  await extractFixLayer(ss2Data);
}

main()
  .then(() => {
    console.log("done");
  })
  .catch((e) => {
    console.error(e);
  });

export {};
