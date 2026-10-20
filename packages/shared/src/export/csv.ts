export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | boolean | null | undefined;
}

/**
 * CSV pensado para abrir con doble click en Excel con configuración regional es-AR: separador `;`
 * (Excel AR usa `,` como decimal, así que no puede ser el separador), números con coma decimal y
 * BOM UTF-8 para que no rompa los acentos.
 */
export function toCsv<T>(rows: readonly T[], columns: readonly CsvColumn<T>[]): string {
  const lines = [
    columns.map((c) => escapeCell(c.header)),
    ...rows.map((row) => columns.map((c) => formatCell(c.value(row)))),
  ];
  return "﻿" + lines.map((cells) => cells.join(";")).join("\r\n");
}

function formatCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number")
    return Number.isFinite(value) ? String(value).replace(".", ",") : "";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  return escapeCell(value);
}

function escapeCell(value: string): string {
  // Excel ejecuta celdas que empiezan con = + - @ como fórmulas (CSV injection) — un nombre de
  // producto como "=HYPERLINK(...)" no tiene que poder hacer eso.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[;"\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}
