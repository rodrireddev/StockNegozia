import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAccount } from "@/accounts/AccountContext";
import { claimDailyMission, getTodayMission } from "@/accounts/api/gamification.api";
import { stockMovementsRepository } from "@/features/inventory/data/stock-movements.repository";
import { salesRepository } from "@/features/sales/data/repository";

function startOfLocalToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * El progreso (3 ventas, 5 productos con stock actualizado) se cuenta 100% local — esos datos
 * nunca llegan al backend (doc §6), así que la única forma de saber si la misión de hoy se
 * cumplió es contar acá y avisarle al servidor cuando corresponda. "Hoy" es el día calendario
 * del dispositivo, no UTC — es lo que un comerciante entiende como "hoy".
 */
export function useDailyMissionProgress() {
  const { status, refetchMe } = useAccount();
  const queryClient = useQueryClient();

  const missionQuery = useQuery({
    queryKey: ["daily-mission", "today"],
    queryFn: getTodayMission,
    enabled: status === "authenticated",
  });

  const progressQuery = useQuery({
    queryKey: ["daily-mission", "progress", missionQuery.data?.missionKey],
    queryFn: () => {
      const from = startOfLocalToday();
      if (missionQuery.data?.missionKey === "update_5_products_stock") {
        const movements = stockMovementsRepository.findMany({ type: "ADJUSTMENT", from });
        return new Set(movements.map((movement) => movement.productId)).size;
      }
      // Por defecto (y para "register_3_sales"): ventas completadas de hoy.
      return salesRepository
        .findMany()
        .filter((sale) => sale.status === "completed" && sale.createdAt >= from).length;
    },
    enabled: status === "authenticated" && !!missionQuery.data && !missionQuery.data.alreadyClaimedToday,
  });

  const mission = missionQuery.data;
  const progress = Math.min(progressQuery.data ?? 0, mission?.target ?? 0);
  const canClaim = !!mission && !mission.alreadyClaimedToday && progress >= mission.target;

  useEffect(() => {
    if (!canClaim) return;
    claimDailyMission().then((result) => {
      void queryClient.invalidateQueries({ queryKey: ["daily-mission", "today"] });
      if (result.creditsAwarded > 0) void refetchMe();
    });
    // Silencioso a propósito (doc: "nunca bloquea nada") — si falla, se reintenta la próxima vez
    // que este hook vuelva a evaluar `canClaim` (ej. al reabrir Beneficios).
  }, [canClaim, queryClient, refetchMe]);

  return { mission, progress, claimed: mission?.alreadyClaimedToday ?? false };
}
