/**
 * Metro resuelve `require`/`import` de archivos de audio a un id numérico de asset — TypeScript
 * necesita esta declaración ambiental para tipar ese import (usado por `useScanBeep`, ver
 * `src/features/scanner/useScanBeep.ts`). No hay ninguna declaración equivalente en
 * `expo/tsconfig.base` para audio (solo para imágenes vía otros mecanismos), así que se agrega acá.
 */
declare module "*.wav" {
  const value: number;
  export default value;
}
