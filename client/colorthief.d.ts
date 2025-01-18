declare module 'colorthief/dist/color-thief.mjs' {
  export default class ColorThief {
    getColor(
      sourceImage: HTMLImageElement,
      quality?: number
    ): [number, number, number];
    getPalette(
      sourceImage: HTMLImageElement,
      colorCount?: number,
      quality?: number
    ): [number, number, number][];
  }
}
