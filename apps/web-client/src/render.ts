import type { ProductDto } from "@stocknegozia/api-contracts";

/** Funciones puras (sin tocar el DOM) — así se pueden testear sin jsdom. */

export function formatProductsList(products: ProductDto[]): string[] {
  return products.map((product) => `${product.id} — ${product.name}`);
}

export function formatDisconnectedStatus(message?: string): { text: string; className: string } {
  const suffix = message ? ` — ${message}` : "";
  return { text: `○ Disconnected${suffix}`, className: "status disconnected" };
}

export function formatPairingNeeded(): { text: string; className: string } {
  return { text: "○ Sin emparejar", className: "status disconnected" };
}

export function formatAuthorized(deviceName: string): { text: string; className: string } {
  return { text: `● Autorizado (${deviceName})`, className: "status connected" };
}
