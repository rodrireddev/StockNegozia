import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/stores/auth-store";

/** Envuelve las rutas del panel — sin sesión (o vencida), redirige a `/login`. */
export function RequireAdminSession() {
  const session = useAuthStore((state) => state.session);
  if (!session) return <Navigate to="/login" replace />;
  return <Outlet />;
}
