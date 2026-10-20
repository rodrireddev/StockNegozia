import type { CustomerDto } from "@stocknegozia/api-contracts";
import { formatMoney } from "@stocknegozia/shared";
import { BookUser, Loader2, Pencil, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { ExportCsvButton } from "@/components/ExportCsvButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { CustomerAccountDialog } from "../components/CustomerAccountDialog";
import { CustomerFormDialog } from "../components/CustomerFormDialog";
import { useCustomers } from "../hooks/useCustomers";

const dateFormatter = new Intl.DateTimeFormat("es-AR", { dateStyle: "short" });
const formatDate = (iso: string | null) => (iso ? dateFormatter.format(new Date(iso)) : "—");

export function CustomersPage() {
  const { data: customers, isLoading, isError, refetch } = useCustomers();
  const [dialog, setDialog] = useState<CustomerDto | "new" | null>(null);
  const [accountOf, setAccountOf] = useState<CustomerDto | null>(null);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return customers;
    return customers?.filter((c) =>
      [c.name, c.phone, c.email, c.documentNumber].some((v) => v?.toLowerCase().includes(term)),
    );
  }, [customers, search]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Clientes</h1>
        <div className="flex gap-2">
          <ExportCsvButton
            fileName="clientes"
            rows={filtered}
            columns={[
              { header: "Nombre", value: (c) => c.name },
              { header: "Teléfono", value: (c) => c.phone },
              { header: "Email", value: (c) => c.email },
              { header: "DNI / CUIT", value: (c) => c.documentNumber },
              { header: "Compras", value: (c) => c.salesCount },
              { header: "Total comprado", value: (c) => c.totalSpent },
              { header: "Saldo cuenta corriente", value: (c) => c.balance },
              { header: "Última compra", value: (c) => formatDate(c.lastSaleAt) },
              { header: "Notas", value: (c) => c.notes },
            ]}
          />
          <Button onClick={() => setDialog("new")}>+ Nuevo cliente</Button>
        </div>
      </div>

      <Input
        placeholder="Buscar por nombre, teléfono, email o documento"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="max-w-sm"
      />

      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Cargando clientes…</span>
        </div>
      )}

      {isError && !isLoading && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-sm text-muted-foreground">No se pudo cargar los clientes.</p>
          <Button variant="outline" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      )}

      {!isLoading && !isError && customers?.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
          <Users className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No tenés clientes todavía. Podés asociar uno al confirmar una venta.
          </p>
        </div>
      )}

      {!isLoading && !isError && filtered && filtered.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>DNI / CUIT</TableHead>
              <TableHead className="text-right">Compras</TableHead>
              <TableHead className="text-right">Total comprado</TableHead>
              <TableHead>Última compra</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell className="font-medium">{customer.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {[customer.phone, customer.email].filter(Boolean).join(" · ") || "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {customer.documentNumber ?? "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">{customer.salesCount}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMoney(customer.totalSpent)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(customer.lastSaleAt)}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right tabular-nums",
                    customer.balance > 0 ? "font-medium text-warning" : "text-muted-foreground",
                  )}
                >
                  {customer.balance === 0 ? "—" : formatMoney(customer.balance)}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <Button size="sm" variant="ghost" onClick={() => setAccountOf(customer)}>
                    <BookUser className="h-4 w-4" />
                    <span className="sr-only">Cuenta corriente de {customer.name}</span>
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setDialog(customer)}>
                    <Pencil className="h-4 w-4" />
                    <span className="sr-only">Editar {customer.name}</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <CustomerFormDialog customer={dialog} onOpenChange={(open) => !open && setDialog(null)} />
      <CustomerAccountDialog
        customer={accountOf}
        onOpenChange={(open) => !open && setAccountOf(null)}
      />
    </div>
  );
}
