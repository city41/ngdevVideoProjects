import { createCanvas, Canvas } from "canvas";

type RgbPalette = Array<[number, number, number, number]>;

const map: Record<string, number> = {
  0: 3,
  1: 2,
  2: 1,
  3: 0,
  4: 7,
  5: 6,
  6: 5,
  7: 4,
};

function getTileIndexedColorData(tileData: number[]): number[] {
  const tileIndexData: number[] = [];

  for (let y = 0; y < 16; ++y) {
    for (let x = 0; x < 8; ++x) {
      const pixelPair = tileData[y * 8 + map[x]];

      const leftPixelColorIndex = (pixelPair >> 4) & 0xf;
      const rightPixelColorIndex = pixelPair & 0xf;

      tileIndexData.push(leftPixelColorIndex, rightPixelColorIndex);
    }
  }

  return tileIndexData;
}

function flip(c: Canvas, hFlip: boolean): Canvas {
  if (!hFlip) {
    return c;
  }

  const fc = createCanvas(c.width, c.height);
  const fcc = fc.getContext("2d");

  fcc.translate(c.width, 0);
  fcc.scale(-1, 1);

  fcc.drawImage(c, 0, 0);

  return fc;
}

export function renderTileToCanvas(
  rgbPalette: RgbPalette,
  tileData: number[],
  hFlip: boolean
): Canvas {
  const tileCanvas = createCanvas(16, 16);
  const tileContext = tileCanvas.getContext("2d")!;

  const indexedTileData = getTileIndexedColorData(tileData);

  const imageData = tileContext.getImageData(0, 0, 16, 16);

  for (let y = 0; y < 16; ++y) {
    for (let x = 0; x < 16; ++x) {
      const pixelPaletteIndex = indexedTileData[y * 16 + x];
      const pixel = rgbPalette[pixelPaletteIndex];

      for (let i = 0; i < pixel.length; ++i) {
        imageData.data[(y * 16 + x) * 4 + i] = pixel[i];
      }
    }
  }

  tileContext.putImageData(imageData, 0, 0);

  return flip(tileCanvas, hFlip);
}
