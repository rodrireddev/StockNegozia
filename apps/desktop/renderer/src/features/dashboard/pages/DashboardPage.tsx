import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useHealth } from "@/hooks/useHealth";

export function DashboardPage() {
  const { data, isLoading, isError } = useHealth();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Panel</h1>

      <Card>
        <CardHeader>
          <CardTitle>Estado del sistema</CardTitle>
          <CardDescription>Conexión con el backend de StockNegozia</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {isLoading && <p className="text-muted-foreground">Consultando backend…</p>}
          {isError && <p className="text-destructive">No se pudo contactar al backend.</p>}
          {data && (
            <>
              <p>
                Estado: <span className="font-medium">{data.status}</span>
              </p>
              <p>
                Base de datos:{" "}
                <span className="font-medium">
                  {data.database.connected ? "conectada" : "desconectada"}
                </span>
              </p>
              <p>
                Tiempo activo:{" "}
                <span className="font-medium">{Math.round(data.uptimeSeconds)}s</span>
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
