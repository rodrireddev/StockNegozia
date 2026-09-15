import { useMutation } from "@tanstack/react-query";
import { selectAndValidateBackup } from "../api/backup.api";

export function useSelectAndValidateBackup() {
  return useMutation({ mutationFn: selectAndValidateBackup });
}
