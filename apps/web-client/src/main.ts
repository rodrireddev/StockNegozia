import { AuthRequiredError, checkHealth, confirmPairing, getMe, loadProducts } from "./api";
import { resolveApiUrl } from "./config";
import { clearStoredCredential, getStoredCredential, setStoredCredential } from "./credential-store";
import { parsePairingPayload } from "./pairing";
import {
  formatAuthorized,
  formatDisconnectedStatus,
  formatPairingNeeded,
  formatProductsList,
} from "./render";

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

const pairingSectionEl = byId<HTMLElement>("pairing-section");
const pairingPayloadEl = byId<HTMLTextAreaElement>("pairing-payload");
const pairingCodeEl = byId<HTMLInputElement>("pairing-code");
const pairingDeviceNameEl = byId<HTMLInputElement>("pairing-device-name");
const pairDeviceBtn = byId<HTMLButtonElement>("pair-device");
const pairingErrorEl = byId<HTMLElement>("pairing-error");

backendUrlEl.textContent = resolveApiUrl();

function setStatus(state: { text: string; className: string }): void {
  statusEl.textContent = state.text;
  statusEl.className = state.className;
}

function friendlyConnectionError(): string {
  return "No se pudo conectar con StockNegozia backend.";
}

/**
 * Estados del dispositivo (ver docs/lan/DEVICE_MANAGEMENT.md §Web Client): sin emparejar → se
 * muestra el formulario de pairing y se deshabilita `Load Products`; autorizado → se oculta el
 * formulario y se habilita `Load Products`. No hay un estado "pendiente" (ver la nota de diseño
 * de M14): la credential se recibe de una sola vez al confirmar el pairing.
 */
function showPairingNeeded(): void {
  pairingSectionEl.hidden = false;
  loadProductsBtn.disabled = true;
  setStatus(formatPairingNeeded());
}

function showAuthorized(deviceName: string): void {
  pairingSectionEl.hidden = true;
  loadProductsBtn.disabled = false;
  setStatus(formatAuthorized(deviceName));
}

/** Chequeo pasivo al cargar la página — además del botón "Check Backend", que el usuario dispara a mano. */
async function refreshConnectionStatus(): Promise<void> {
  try {
    await checkHealth();
  } catch {
    setStatus(formatDisconnectedStatus());
    return;
  }

  const credential = getStoredCredential();
  if (!credential) {
    showPairingNeeded();
    return;
  }

  try {
    const me = await getMe();
    showAuthorized(me.name);
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      showPairingNeeded();
      return;
    }
    setStatus(formatDisconnectedStatus());
  }
}

async function handleCheckBackend(): Promise<void> {
  checkBackendBtn.disabled = true;
  healthResultEl.textContent = "Checking…";
  try {
    const health = await checkHealth();
    healthResultEl.textContent = `Backend: ${health.status.toUpperCase()} (db: ${health.database.connected ? "connected" : "disconnected"})`;
    await refreshConnectionStatus();
  } catch (error) {
    healthResultEl.textContent = friendlyConnectionError();
    setStatus(formatDisconnectedStatus());
    console.error(error);
  } finally {
    checkBackendBtn.disabled = false;
  }
}

async function handlePairDevice(): Promise<void> {
  pairingErrorEl.textContent = "";
  const parsed = parsePairingPayload(pairingPayloadEl.value.trim());
  if (!parsed) {
    pairingErrorEl.textContent = "El JSON pegado no es válido. Copiá el contenido completo del QR.";
    return;
  }
  const verificationCode = pairingCodeEl.value.trim();
  if (!/^\d{6}$/.test(verificationCode)) {
    pairingErrorEl.textContent = "El código de verificación tiene que ser de 6 dígitos.";
    return;
  }

  pairDeviceBtn.disabled = true;
  try {
    const result = await confirmPairing({
      pairingId: parsed.pairingId,
      token: parsed.token,
      verificationCode,
      deviceName: pairingDeviceNameEl.value.trim() || undefined,
    });
    setStoredCredential(result.credential);
    pairingPayloadEl.value = "";
    pairingCodeEl.value = "";
    pairingDeviceNameEl.value = "";
    showAuthorized(result.device.name);
  } catch (error) {
    pairingErrorEl.textContent = error instanceof Error ? error.message : friendlyConnectionError();
  } finally {
    pairDeviceBtn.disabled = false;
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
    loadProductsBtn.disabled = false;
  } catch (error) {
    productsResultEl.textContent = "";
    if (error instanceof AuthRequiredError) {
      clearStoredCredential();
      productsErrorEl.textContent = "Device access revoked. Please pair this device again.";
      showPairingNeeded();
      return;
    }
    productsErrorEl.textContent =
      error instanceof Error ? error.message : friendlyConnectionError();
    loadProductsBtn.disabled = false;
  }
}

checkBackendBtn.addEventListener("click", () => void handleCheckBackend());
pairDeviceBtn.addEventListener("click", () => void handlePairDevice());
loadProductsBtn.addEventListener("click", () => void handleLoadProducts());

void refreshConnectionStatus();
