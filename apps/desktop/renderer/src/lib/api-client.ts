const backendBaseUrl = window.stockNegozia?.backendBaseUrl ?? "http://localhost:38123";

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${backendBaseUrl}${path}`);
  if (!response.ok) {
    throw new Error(`Request to ${path} failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
}
