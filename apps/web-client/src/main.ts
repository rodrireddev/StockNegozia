import { checkHealth, loadProducts } from "./api";
import { resolveApiUrl } from "./config";
import { formatConnectedStatus, formatDisconnectedStatus, formatProductsList } from "./render";

function byId<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id} in index.html`);
  return el as T;
}

const backendUrlEl = byId<HTMLElement>("backend-url");
const statusEl = byId<HTMLElement>("status");
const checkBackendBtn = byId<HTMLButtonElement>("check-backend");
const healthResultEl = byId<HTMLElement>("health-result");
const loadProductsBtn = byId<HTMLButtonElement>("load-products");
const productsErrorEl = byId<HTMLElement>("products-error");
const productsResultEl = byId<HTMLElement>("products-result");

backendUrlEl.textContent = resolveApiUrl();

function setStatus(state: { text: string; className: string }): void {
  statusEl.textContent = state.text;
  statusEl.className = state.className;
}

function friendlyConnectionError(): string {
  return "No se pudo conectar con StockNegozia backend.";
}

/** Chequeo pasivo al cargar la página — además del botón "Check Backend", que el usuario dispara a mano. */
async function refreshConnectionStatus(): Promise<void> {
  try {
    await checkHealth();
    setStatus(formatConnectedStatus());
  } catch {
    setStatus(formatDisconnectedStatus());
  }
}

async function handleCheckBackend(): Promise<void> {
  checkBackendBtn.disabled = true;
  healthResultEl.textContent = "Checking…";
  try {
    const health = await checkHealth();
    healthResultEl.textContent = `Backend: ${health.status.toUpperCase()} (db: ${health.database.connected ? "connected" : "disconnected"})`;
    setStatus(formatConnectedStatus());
  } catch (error) {
    healthResultEl.textContent = friendlyConnectionError();
    setStatus(formatDisconnectedStatus());
    console.error(error);
  } finally {
    checkBackendBtn.disabled = false;
  }
}

async function handleLoadProducts(): Promise<void> {
  loadProductsBtn.disabled = true;
  productsErrorEl.textContent = "";
  productsResultEl.textContent = "Loading…";
  try {
    const products = await loadProducts();
    const lines = formatProductsList(products);
    productsResultEl.innerHTML =
      lines.length > 0
        ? `<p>Products</p><ul>${lines.map((line) => `<li>${line}</li>`).join("")}</ul>`
        : "<p>No hay productos activos.</p>";
  } catch (error) {
    productsResultEl.textContent = "";
    productsErrorEl.textContent =
      error instanceof Error ? error.message : friendlyConnectionError();
  } finally {
    loadProductsBtn.disabled = false;
  }
}

checkBackendBtn.addEventListener("click", () => void handleCheckBackend());
loadProductsBtn.addEventListener("click", () => void handleLoadProducts());

void refreshConnectionStatus();
