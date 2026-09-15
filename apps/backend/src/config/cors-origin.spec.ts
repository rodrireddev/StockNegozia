import { describe, expect, it, vi } from "vitest";
import { createCorsOriginValidator } from "./cors-origin";

describe("createCorsOriginValidator", () => {
  it("permite un request sin Origin header (clientes no-browser)", () => {
    const validate = createCorsOriginValidator();
    const callback = vi.fn();

    validate(undefined, callback);

    expect(callback).toHaveBeenCalledWith(null, true);
  });

  it("permite los orígenes conocidos por defecto", () => {
    const validate = createCorsOriginValidator();

    for (const origin of ["http://localhost:5173", "http://localhost:5544"]) {
      const callback = vi.fn();
      validate(origin, callback);
      expect(callback).toHaveBeenCalledWith(null, true);
    }
  });

  it("permite el Web Client accedido por IP LAN en el puerto 5544", () => {
    const validate = createCorsOriginValidator();
    const callback = vi.fn();

    validate("http://192.168.1.42:5544", callback);

    expect(callback).toHaveBeenCalledWith(null, true);
  });

  it("permite orígenes extra configurados explícitamente", () => {
    const validate = createCorsOriginValidator(["https://packaged-app.local"]);
    const callback = vi.fn();

    validate("https://packaged-app.local", callback);

    expect(callback).toHaveBeenCalledWith(null, true);
  });

  it("rechaza un origen desconocido", () => {
    const validate = createCorsOriginValidator();
    const callback = vi.fn();

    validate("http://evil.example.com", callback);

    expect(callback).toHaveBeenCalledWith(expect.any(Error), false);
  });

  it("rechaza el puerto del Web Client con una IP fuera de rango LAN válido", () => {
    const validate = createCorsOriginValidator();
    const callback = vi.fn();

    validate("http://192.168.1.42:5545", callback);

    expect(callback).toHaveBeenCalledWith(expect.any(Error), false);
  });
});
