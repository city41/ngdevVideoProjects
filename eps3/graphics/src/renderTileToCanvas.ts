import {
  createCanvas,
  Canvas,
  CanvasRenderingContext2D,
  ImageData,
} from "canvas";

export type RgbPalette = Array<[number, number, number, number]>;

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

export function renderSpriteTileToCanvas(
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

function getFixPixels(
  sData: number[],
  tileIndex: number,
  palette: RgbPalette
): number[][][] {
  let startIndex = tileIndex * 32;

  const pixels: number[][][] = [[], [], [], [], [], [], [], []];

  // get column A
  for (let i = 0; i < 8; ++i) {
    const pixelPair = sData[startIndex++];
    const rightPixelIndex = (pixelPair >> 4) & 0xf;
    const leftPixelIndex = pixelPair & 0xf;

    const leftPixelRgb = palette[leftPixelIndex];
    const rightPixelRgb = palette[rightPixelIndex];

    pixels[i][4] = leftPixelRgb;
    pixels[i][5] = rightPixelRgb;
  }

  // get column B
  for (let i = 0; i < 8; ++i) {
    const pixelPair = sData[startIndex++];
    const rightPixelIndex = (pixelPair >> 4) & 0xf;
    const leftPixelIndex = pixelPair & 0xf;

    const leftPixelRgb = palette[leftPixelIndex];
    const rightPixelRgb = palette[rightPixelIndex];

    pixels[i][6] = leftPixelRgb;
    pixels[i][7] = rightPixelRgb;
  }

  // get column C
  for (let i = 0; i < 8; ++i) {
    const pixelPair = sData[startIndex++];
    const rightPixelIndex = (pixelPair >> 4) & 0xf;
    const leftPixelIndex = pixelPair & 0xf;

    const leftPixelRgb = palette[leftPixelIndex];
    const rightPixelRgb = palette[rightPixelIndex];

    pixels[i][0] = leftPixelRgb;
    pixels[i][1] = rightPixelRgb;
  }

  // get column D
  for (let i = 0; i < 8; ++i) {
    const pixelPair = sData[startIndex++];
    const rightPixelIndex = (pixelPair >> 4) & 0xf;
    const leftPixelIndex = pixelPair & 0xf;

    const leftPixelRgb = palette[leftPixelIndex];
    const rightPixelRgb = palette[rightPixelIndex];

    pixels[i][2] = leftPixelRgb;
    pixels[i][3] = rightPixelRgb;
  }

  return pixels;
}

function placeFixData(imageData: ImageData, tilePixels: number[][][]) {
  for (let y = 0; y < 8; ++y) {
    for (let x = 0; x < 8; ++x) {
      const index = (y * 8 + x) * 4;
      const color = tilePixels[y][x];

      for (let c = 0; c < 4; ++c) {
        imageData.data[index + c] = color[c];
      }
    }
  }
}

function renderFixTile(
  pixelData: number[][][],
  context: CanvasRenderingContext2D
) {
  const imageData = context.createImageData(8, 8);
  placeFixData(imageData, pixelData);
  context.putImageData(imageData, 0, 0);
}

export function renderFixTileToCanvas(
  sData: number[],
  tileIndex: number,
  rgbPalette: RgbPalette
): Canvas {
  const pixels = getFixPixels(sData, tileIndex, rgbPalette);

  const canvas = createCanvas(8, 8);
  renderFixTile(pixels, canvas.getContext("2d"));

  return canvas;
}
