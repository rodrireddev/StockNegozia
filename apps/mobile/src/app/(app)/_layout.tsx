import { Redirect } from "expo-router";
import { useAuth } from "@/auth/AuthContext";
import { AdaptiveShell } from "@/navigation/AdaptiveShell";

export default function AppLayout() {
  const { status } = useAuth();
  if (status !== "authenticated") return <Redirect href="/pairing" />;
  return <AdaptiveShell />;
}
