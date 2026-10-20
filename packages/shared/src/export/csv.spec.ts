import { describe, expect, it } from "vitest";
import { toCsv } from "./csv";

describe("toCsv", () => {
  const columns = [
    {
      header: "Nombre",
      value: (r: { name: string; price: number; active: boolean | null }) => r.name,
    },
    { header: "Precio", value: (r: { price: number }) => r.price },
    { header: "Activo", value: (r: { active: boolean | null }) => r.active },
  ];

  it("arma header + filas con ; , BOM y coma decimal", () => {
    const csv = toCsv([{ name: "Yerba", price: 1234.5, active: true }], columns);
    expect(csv).toBe("﻿Nombre;Precio;Activo\r\nYerba;1234,5;Sí");
  });

  it("escapa separadores, comillas y saltos de línea", () => {
    const csv = toCsv([{ name: 'Té "verde"; 1kg\nx', price: 1, active: null }], columns);
    expect(csv.split("\r\n")[1]).toBe('"Té ""verde""; 1kg\nx";1;');
  });

  it("neutraliza fórmulas (CSV injection)", () => {
    const csv = toCsv([{ name: "=HYPERLINK(1)", price: -5, active: false }], columns);
    expect(csv.split("\r\n")[1]).toBe("'=HYPERLINK(1);-5;No");
  });
});
