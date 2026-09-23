import { useState } from "react";
import { Modal } from "react-native";
import { Button } from "@/components/Button";
import { OnboardingScreen } from "../screens/OnboardingScreen";

/**
 * "¿Cómo funciona?" a pedido — el walkthrough automático (`RootLayout`) solo se muestra una vez,
 * en la primera instalación; esto es para volver a verlo después, sin depender de reinstalar la
 * app o borrar sus datos.
 */
export function OnboardingRecapButton() {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <Button label="¿Cómo funciona esto?" variant="ghost" onPress={() => setVisible(true)} />
      <Modal visible={visible} animationType="slide" onRequestClose={() => setVisible(false)}>
        <OnboardingScreen onFinish={() => setVisible(false)} />
      </Modal>
    </>
  );
}
