import { Redirect } from "expo-router";
import { useAuth } from "@/auth/AuthContext";

/** Gate de entrada — `RootLayout` ya garantiza que `status` no es `bootstrapping` acá. */
export default function Index() {
  const { status } = useAuth();
  return <Redirect href={status === "authenticated" ? "/products" : "/pairing"} />;
}
