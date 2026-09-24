import { getNativeAdsModule } from "./nativeAdsModule";

describe("getNativeAdsModule", () => {
  it("devuelve null en vez de crashear cuando no hay módulo nativo (Jest no lo tiene, igual que Expo Go)", () => {
    expect(getNativeAdsModule()).toBeNull();
  });

  it("cachea el resultado — no vuelve a intentar el require en cada llamada", () => {
    expect(getNativeAdsModule()).toBe(getNativeAdsModule());
  });
});
