import { StyleSheet, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { spacing, typography } from "@/theme/tokens";
import { useTheme } from "@/theme/useTheme";
import { useRegistrationPrompt } from "../hooks/useRegistrationPrompt";

/** Banner liviano y descartable (doc §3) — nunca bloquea nada, solo invita a ver "Beneficios". */
export function RegistrationPromptBanner() {
  const { colors } = useTheme();
  const router = useRouter();
  const { visible, dismiss } = useRegistrationPrompt();

  if (!visible) return null;

  return (
    <Card style={styles.card}>
      <Text style={[typography.bodyStrong, { color: colors.foreground }]}>
        Ya tenés bastante cargado en StockNegozia — creá una cuenta gratis para no perderlo y
        empezar a juntar créditos.
      </Text>
      <View style={styles.actions}>
        <Button label="Ahora no" variant="ghost" onPress={dismiss} />
        <Button label="Ver beneficios" onPress={() => router.push("/benefits" as Href)} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm, marginBottom: spacing.md },
  actions: { flexDirection: "row", gap: spacing.sm, justifyContent: "flex-end" },
});
