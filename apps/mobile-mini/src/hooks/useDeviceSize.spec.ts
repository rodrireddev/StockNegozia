import { computeDeviceSize } from "./useDeviceSize";

describe("computeDeviceSize", () => {
  it("clasifica un ancho de teléfono como no-tablet", () => {
    expect(computeDeviceSize(390, 844).isTablet).toBe(false);
  });

  it("clasifica un ancho >= 768dp como tablet", () => {
    expect(computeDeviceSize(800, 1200).isTablet).toBe(true);
  });

  it("768dp exacto ya cuenta como tablet (breakpoint inclusivo)", () => {
    expect(computeDeviceSize(768, 1024).isTablet).toBe(true);
  });

  it("detecta orientación landscape cuando el ancho supera al alto", () => {
    expect(computeDeviceSize(1024, 768).isLandscape).toBe(true);
  });

  it("detecta orientación portrait cuando el alto supera al ancho", () => {
    expect(computeDeviceSize(768, 1024).isLandscape).toBe(false);
  });
});
