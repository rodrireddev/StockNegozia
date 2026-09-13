export interface HealthStatus {
  status: "ok" | "error";
  uptimeSeconds: number;
  database: {
    connected: boolean;
  };
  timestamp: string;
}
