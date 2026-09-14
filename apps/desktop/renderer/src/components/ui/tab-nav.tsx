import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

export interface TabNavItem {
  to: string;
  label: string;
  end?: boolean;
}

interface TabNavProps {
  items: TabNavItem[];
}

/** Barra de pestañas simple basada en rutas — usada por Inventario y Compras para agrupar
 *  pantallas relacionadas sin agregar nuevos ítems al sidebar principal. */
export function TabNav({ items }: TabNavProps) {
  return (
    <nav className="flex gap-1 border-b border-border">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            cn(
              "border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
              isActive && "border-primary text-foreground",
            )
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
