import { NavLink, Outlet } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AdBanner } from "@/features/ads/components/AdBanner";
import { useMe } from "@/features/devices/hooks/useMe";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui-store";

const navItems = [
  { to: "/", label: "Panel", end: true },
  { to: "/products", label: "Productos" },
  { to: "/sales", label: "Ventas" },
  { to: "/purchases", label: "Compras" },
  { to: "/inventory", label: "Inventario" },
  { to: "/profits", label: "Ganancias" },
  { to: "/cash-adjustments", label: "Ajustes de caja" },
  { to: "/suppliers", label: "Proveedores" },
  { to: "/devices", label: "Dispositivos" },
  { to: "/benefits", label: "Beneficios" },
  { to: "/settings", label: "Configuración" },
];

export function MainLayout() {
  const { sidebarCollapsed, toggleSidebar } = useUiStore();
  const me = useMe();

  return (
    <div className="flex h-screen">
      <aside
        className={cn(
          "shrink-0 border-r border-border bg-secondary/40 p-4 transition-all",
          sidebarCollapsed ? "w-16" : "w-56",
        )}
      >
        <div className="mb-6 flex items-center justify-between">
          {!sidebarCollapsed && (
            <div>
              <div className="flex items-center gap-2">
                {/* `BASE_URL`: "/" en desarrollo, "./" en la app empaquetada (se abre desde `file://`,
                    donde "/branding/..." apuntaba a la raíz del disco y la imagen no cargaba). */}
                <img
                  src={`${import.meta.env.BASE_URL}branding/logo.png`}
                  alt=""
                  className="h-6 w-6"
                />
                <h1 className="text-lg font-semibold">StockNegozia</h1>
              </div>
              {me.data?.sellerName && (
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  Vendedor Actual: {me.data.sellerName}
                </p>
              )}
            </div>
          )}
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
      <AdBanner />
    </div>
  );
}
