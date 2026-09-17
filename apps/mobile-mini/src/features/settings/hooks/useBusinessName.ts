import { useEffect, useState } from "react";
import { getBusinessName, setBusinessName } from "../data/businessName";

/** Carga/guarda el nombre del negocio local — sin react-query: es un único valor en `AsyncStorage`,
 *  no un recurso remoto que necesite cache/invalidación. */
export function useBusinessName() {
  const [value, setValue] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getBusinessName().then((stored) => {
      if (cancelled) return;
      setValue(stored);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function save(next: string | null): Promise<void> {
    setIsSaving(true);
    try {
      await setBusinessName(next);
      setValue(next);
    } finally {
      setIsSaving(false);
    }
  }

  return { value, loaded, isSaving, save };
}
