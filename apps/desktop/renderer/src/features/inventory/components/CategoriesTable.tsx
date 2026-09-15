import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CategoryCount } from "@stocknegozia/shared";

export function CategoriesTable({ categories }: { categories: CategoryCount[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Categoría</TableHead>
          <TableHead className="text-right">Productos</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {categories.map((category) => (
          <TableRow key={category.id ?? "uncategorized"}>
            <TableCell className="font-medium">{category.name}</TableCell>
            <TableCell className="text-right tabular-nums">{category.productCount}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
