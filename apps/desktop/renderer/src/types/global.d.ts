export interface StockNegoziaApi {
  backendBaseUrl: string;
  versions: Record<string, string>;
}

declare global {
  interface Window {
    stockNegozia: StockNegoziaApi;
  }
}

export {};
