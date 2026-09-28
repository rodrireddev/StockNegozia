import { NavLink, Outlet } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";

const NAV_ITEMS = [
  { to: "/", label: "Créditos", end: true },
  { to: "/achievements", label: "Logros", end: false },
  { to: "/ad-placements", label: "Ad placements", end: false },
  { to: "/house-ads", label: "House ads", end: false },
];

/** Nav compartida entre las páginas del panel — apareció al agregar la segunda página (antes solo
 *  existía credit-config, sin nada que navegar). */
export function AdminLayout() {
  const clearSession = useAuthStore((state) => state.clearSession);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-border px-6 py-3">
        <nav className="flex gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <Button variant="outline" size="sm" onClick={clearSession}>
          Salir
        </Button>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
