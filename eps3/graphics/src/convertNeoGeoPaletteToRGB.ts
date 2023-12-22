/**
 * Convert from a neo geo palette color to a 32 rgb color
 * https://wiki.neogeodev.org/index.php?title=Colors
 */
function convertNeoGeoColorToRGBColor(
  col16: number
): [number, number, number, number] {
  // the least significant bit is shared by each channel
  // if it is zero, the entire color is a tad darker, hence the name "dark bit"
  const darkBit = (col16 >> 15) & 1;

  const upperB = (col16 & 0xf) << 2;
  const lowerB = ((col16 >> 12) & 1) << 1;
  const b5 = upperB | lowerB | darkBit;

  const upperG = ((col16 >> 4) & 0xf) << 2;
  const lowerG = ((col16 >> 13) & 1) << 1;
  const g5 = upperG | lowerG | darkBit;

  const upperR = ((col16 >> 8) & 0xf) << 2;
  const lowerR = ((col16 >> 14) & 1) << 1;
  const r5 = upperR | lowerR | darkBit;

  // neo geo color channels are six bits (max value of 63), but need to map
  // them to a 8 bit color channel (max value of 255)
  const b = (b5 / 63) * 255;
  const g = (g5 / 63) * 255;
  const r = (r5 / 63) * 255;

  return [r, g, b, 255];
}

export function convertNeoGeoPaletteToRGB(
  neoGeoPalette: number[]
): Array<[number, number, number, number]> {
  const mapped = neoGeoPalette.map(convertNeoGeoColorToRGBColor);

  // the first color is always transparent
  return [[0, 0, 0, 0], ...mapped.slice(1)];
}
