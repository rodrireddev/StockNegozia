import { NavLink, Outlet } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui-store";

const navItems = [
  { to: "/", label: "Panel", end: true },
  { to: "/products", label: "Productos" },
  { to: "/sales", label: "Ventas" },
  { to: "/purchases", label: "Compras" },
  { to: "/inventory", label: "Inventario" },
  { to: "/settings", label: "Configuración" },
];

export function MainLayout() {
  const { sidebarCollapsed, toggleSidebar } = useUiStore();

  return (
    <div className="flex h-screen">
      <aside
        className={cn(
          "shrink-0 border-r border-border bg-secondary/40 p-4 transition-all",
          sidebarCollapsed ? "w-16" : "w-56",
        )}
      >
        <div className="mb-6 flex items-center justify-between">
          {!sidebarCollapsed && <h1 className="text-lg font-semibold">StockNegozia</h1>}
          <Button variant="ghost" size="icon" onClick={toggleSidebar}>
            {sidebarCollapsed ? "»" : "«"}
          </Button>
        </div>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent",
                  isActive && "bg-accent text-accent-foreground",
                  sidebarCollapsed && "text-center px-0",
                )
              }
            >
              {sidebarCollapsed ? item.label.slice(0, 1) : item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
