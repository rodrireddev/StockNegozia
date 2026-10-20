import { useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Download } from "lucide-react-native";
import { toCsv, type CsvColumn } from "@stocknegozia/shared";
import { useTheme } from "@/theme/useTheme";
import { minTouchTarget, radius, spacing, typography } from "@/theme/tokens";

/** Escribe el CSV en caché y abre la hoja nativa de compartir (Drive, WhatsApp, mail, Archivos) —
 *  mismo mecanismo que el recibo PDF, sin pedir permisos de almacenamiento. */
export async function shareCsv<T>(
  fileName: string,
  rows: readonly T[],
  columns: readonly CsvColumn<T>[],
): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Compartir archivos no está disponible en este dispositivo");
  }
  const uri = `${FileSystem.cacheDirectory}${fileName}-${new Date().toISOString().slice(0, 10)}.csv`;
  await FileSystem.writeAsStringAsync(uri, toCsv(rows, columns), {
    encoding: FileSystem.EncodingType.UTF8,
  });
  await Sharing.shareAsync(uri, {
    mimeType: "text/csv",
    UTI: "public.comma-separated-values-text",
    dialogTitle: "Exportar CSV",
  });
}

interface ExportCsvButtonProps<T> {
  /** Sin extensión — se le agrega la fecha de hoy y `.csv`. */
  fileName: string;
  rows: readonly T[] | undefined;
  columns: readonly CsvColumn<T>[];
}

/** Mismo componente en `apps/mobile` y `apps/mobile-mini`; equivalente al de Desktop. */
export function ExportCsvButton<T>({ fileName, rows, columns }: ExportCsvButtonProps<T>) {
  const { colors } = useTheme();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const disabled = busy || !rows?.length;

  async function handlePress() {
    setError(null);
    setBusy(true);
    try {
      await shareCsv(fileName, rows ?? [], columns);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo exportar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Exportar CSV"
        disabled={disabled}
        onPress={handlePress}
        style={[styles.button, { borderColor: colors.border, opacity: disabled ? 0.5 : 1 }]}
      >
        <Download size={16} color={colors.foreground} />
        <Text style={[typography.label, { color: colors.foreground }]}>Exportar CSV</Text>
      </Pressable>
      {error ? <Text style={[typography.caption, { color: colors.danger }]}>{error}</Text> : null}
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing.xs,
    minHeight: minTouchTarget,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderRadius: radius.lg,
  },
});
