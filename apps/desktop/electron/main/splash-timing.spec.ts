// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ensureMinimumVisible, MIN_SPLASH_VISIBLE_MS } from "./splash-timing";

describe("MIN_SPLASH_VISIBLE_MS", () => {
  it("el mínimo de producción es 1000ms", () => {
    expect(MIN_SPLASH_VISIBLE_MS).toBe(1000);
  });
});

describe("ensureMinimumVisible", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("resuelve inmediatamente si ya pasó el mínimo", async () => {
    const shownAt = Date.now() - 2000;
    let resolved = false;
    ensureMinimumVisible(shownAt, MIN_SPLASH_VISIBLE_MS).then(() => (resolved = true));
    await vi.advanceTimersByTimeAsync(0);
    expect(resolved).toBe(true);
  });

  it("espera solo el tiempo restante si todavía no pasó el mínimo", async () => {
    const shownAt = Date.now() - 100;
    let resolved = false;
    ensureMinimumVisible(shownAt, MIN_SPLASH_VISIBLE_MS).then(() => (resolved = true));

    await vi.advanceTimersByTimeAsync(899);
    expect(resolved).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    expect(resolved).toBe(true);
  });

  it("no espera nada si minimumMs es 0", async () => {
    let resolved = false;
    ensureMinimumVisible(Date.now(), 0).then(() => (resolved = true));
    await vi.advanceTimersByTimeAsync(0);
    expect(resolved).toBe(true);
  });

  it("backend rápido (300ms): el splash dura ~1000ms (el mínimo)", async () => {
    const shownAt = Date.now();
    let resolved = false;
    vi.advanceTimersByTime(300); // el backend "contesta" a los 300ms
    ensureMinimumVisible(shownAt, MIN_SPLASH_VISIBLE_MS).then(() => (resolved = true));

    await vi.advanceTimersByTimeAsync(699);
    expect(resolved).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(resolved).toBe(true);
  });

  it("backend lento (1500ms): el splash dura ~1500ms, no se corta a los 1000ms", async () => {
    const shownAt = Date.now();
    let resolved = false;
    vi.advanceTimersByTime(1500); // el backend "contesta" recién a los 1500ms
    ensureMinimumVisible(shownAt, MIN_SPLASH_VISIBLE_MS).then(() => (resolved = true));

    await vi.advanceTimersByTimeAsync(0);
    expect(resolved).toBe(true); // ya pasó el mínimo, no espera nada extra
  });
});
