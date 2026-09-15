import { Redirect } from "expo-router";
import { useAuth } from "@/auth/AuthContext";
import { PairingScreen } from "@/features/pairing/screens/PairingScreen";

export default function Pairing() {
  const { status } = useAuth();
  if (status === "authenticated") return <Redirect href="/products" />;
  return <PairingScreen />;
}
