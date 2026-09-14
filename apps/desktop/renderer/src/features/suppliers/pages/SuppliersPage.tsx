import { Loader2, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TabNav } from "@/components/ui/tab-nav";
import { SupplierForm } from "../components/SupplierForm";
import { useSuppliers } from "../hooks/useSuppliers";

const dateFormatter = new Intl.DateTimeFormat("es-AR", { dateStyle: "short" });

export function SuppliersPage() {
  const { data: suppliers, isLoading, isError, refetch } = useSuppliers();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Compras</h1>
      <TabNav
        items={[
          { to: "/purchases", label: "Nueva compra", end: true },
          { to: "/purchases/suppliers", label: "Proveedores" },
        ]}
      />

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
              <TableHead>Alta</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers.map((supplier) => (
              <TableRow key={supplier.id}>
                <TableCell className="font-medium">{supplier.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {dateFormatter.format(new Date(supplier.createdAt))}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
