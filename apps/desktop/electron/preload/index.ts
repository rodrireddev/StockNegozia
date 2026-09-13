import { contextBridge } from "electron";
import { DEFAULT_BACKEND_PORT } from "@stocknegozia/shared";

const backendPort = Number(process.env["STOCKNEGOZIA_PORT"]) || DEFAULT_BACKEND_PORT;

const stockNegoziaApi = {
  backendBaseUrl: `http://localhost:${backendPort}`,
  versions: process.versions,
};

contextBridge.exposeInMainWorld("stockNegozia", stockNegoziaApi);

export type StockNegoziaApi = typeof stockNegoziaApi;
