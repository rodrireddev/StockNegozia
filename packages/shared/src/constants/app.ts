export const APP_NAME = "StockNegozia";

export const APP_VERSION = "0.1.0";

export const DEFAULT_BACKEND_PORT = 38123;

export interface AppInfo {
  name: string;
  version: string;
}

export const appInfo: AppInfo = {
  name: APP_NAME,
  version: APP_VERSION,
};
