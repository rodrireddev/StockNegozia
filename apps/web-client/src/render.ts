import type { ProductDto } from "@stocknegozia/api-contracts";

/** Funciones puras (sin tocar el DOM) — así se pueden testear sin jsdom. */

export function formatProductsList(products: ProductDto[]): string[] {
  return products.map((product) => `${product.id} — ${product.name}`);
}

export function formatConnectedStatus(): { text: string; className: string } {
  return { text: "● Connected", className: "status connected" };
}

export function formatDisconnectedStatus(message?: string): { text: string; className: string } {
  const suffix = message ? ` — ${message}` : "";
  return { text: `○ Disconnected${suffix}`, className: "status disconnected" };
}
