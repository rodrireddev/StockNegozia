import { toCsv, type CsvColumn } from "@stocknegozia/shared";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ExportCsvButtonProps<T> {
  /** Sin extensión — se le agrega la fecha de hoy y `.csv`. */
  fileName: string;
  rows: readonly T[] | undefined;
  columns: readonly CsvColumn<T>[];
}

/** Exporta lo que la pantalla ya tiene cargado. Electron muestra el diálogo nativo de "Guardar
 *  como" para descargas sin ruta fija, así que no hace falta un canal IPC propio. */
export function ExportCsvButton<T>({ fileName, rows, columns }: ExportCsvButtonProps<T>) {
  function handleExport() {
    const blob = new Blob([toCsv(rows ?? [], columns)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileName}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={!rows?.length}>
      <Download className="mr-2 h-4 w-4" />
      Exportar CSV
    </Button>
  );
}
