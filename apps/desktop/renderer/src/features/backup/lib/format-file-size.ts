const UNITS = ["B", "KB", "MB", "GB"] as const;

/** Formatea bytes a una unidad legible — un backup típico ronda unos pocos MB. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;

  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < UNITS.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(1)} ${UNITS[unitIndex]}`;
}
