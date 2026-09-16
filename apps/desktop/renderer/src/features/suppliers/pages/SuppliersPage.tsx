import { Loader2, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SupplierForm } from "../components/SupplierForm";
import { SupplierRow } from "../components/SupplierRow";
import { useSuppliers } from "../hooks/useSuppliers";

export function SuppliersPage() {
  const { data: suppliers, isLoading, isError, refetch } = useSuppliers();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Proveedores</h1>

      <SupplierForm />

      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Cargando proveedores…</span>
        </div>
      )}

      {isError && !isLoading && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-sm text-muted-foreground">No se pudo cargar los proveedores.</p>
          <Button variant="outline" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      )}

      {!isLoading && !isError && suppliers && suppliers.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
          <Truck className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No tenés proveedores todavía.</p>
        </div>
      )}

      {!isLoading && !isError && suppliers && suppliers.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Alta</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers.map((supplier) => (
              <SupplierRow key={supplier.id} supplier={supplier} />
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
