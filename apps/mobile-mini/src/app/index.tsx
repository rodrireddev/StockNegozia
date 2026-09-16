import { Redirect } from "expo-router";

/** Sin estado de auth que consultar — la app siempre entra directo a Productos. */
export default function Index() {
  return <Redirect href="/products" />;
}
