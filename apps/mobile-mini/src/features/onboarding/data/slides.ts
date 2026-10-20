import { Coins, Gift, HeartHandshake, type LucideIcon } from "lucide-react-native";

export interface OnboardingSlide {
  icon: LucideIcon;
  title: string;
  body: string;
}

/**
 * Contenido pensado para alguien sin vocabulario técnico (doc ADS_CREDITS_GAMIFICATION.md,
 * público real: kiosqueros, almaceneros) — sin "créditos ganados por rewarded ads con SSV", sin
 * "gamification". Explica, en este orden: (1) nada de esto toca lo gratis de siempre, (2) cómo se
 * ganan y para qué sirven los créditos, (3) por qué el modelo es anuncios opcionales y no una
 * cuota mensual — la pregunta que más va a aparecer.
 */
export const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    icon: Gift,
    title: "La app sigue siendo gratis",
    body: "Vender, cargar stock y usar StockNegozia todos los días es y va a seguir siendo gratis. Todo lo que te mostramos ahora es extra y opcional.",
  },
  {
    icon: Coins,
    title: "Ganá créditos sin gastar plata",
    body: "Usando la app como ya lo hacés, o mirando un anuncio corto cuando vos quieras, vas juntando créditos gratis. Nunca es obligatorio mirar un anuncio — la decisión es siempre tuya. Esos créditos sirven para cosas extra, como guardar una copia de tu negocio en la nube.",
  },
  {
    icon: HeartHandshake,
    title: "¿Por qué no cobramos todos los meses?",
    body: 'Sabemos que un comercio chico no siempre tiene para pagar una suscripción fija. Por eso elegimos que la app se sostenga con anuncios opcionales, no con tu bolsillo: vos decidís cuándo "pagar" con un minuto de tu tiempo, nunca con dinero.',
  },
];
