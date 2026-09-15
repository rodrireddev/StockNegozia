import { describe, expect, it } from "vitest";
import { formatFileSize } from "./format-file-size";

describe("formatFileSize", () => {
  it("muestra bytes sin decimales por debajo de 1 KB", () => {
    expect(formatFileSize(512)).toBe("512 B");
  });

  it("formatea kilobytes", () => {
    expect(formatFileSize(2048)).toBe("2.0 KB");
  });

  it("formatea megabytes", () => {
    expect(formatFileSize(5 * 1024 * 1024)).toBe("5.0 MB");
  });

  it("formatea gigabytes", () => {
    expect(formatFileSize(2 * 1024 * 1024 * 1024)).toBe("2.0 GB");
  });
});
