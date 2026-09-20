export interface FaqItem {
  question: string;
  answer: string;
}

// Fuente única para la sección visible (Faq.astro) y el JSON-LD FAQPage (index.astro) — evita que
// el texto mostrado y el marcado estructurado para buscadores/IA queden desincronizados.
export const faq: FaqItem[] = [
  {
    question: "¿StockNegozia necesita internet para funcionar?",
    answer:
      "No. StockNegozia corre 100% en tu computadora, con una base de datos SQLite local. No depende de una conexión a internet ni de servidores en la nube para vender, comprar o consultar stock.",
  },
  {
    question: "¿Puedo usarlo desde el celular o una tablet además de la PC?",
    answer:
      "Sí. Hay un cliente para Android que se empareja con la PC por red local (LAN) mediante un código QR, sin pasar por internet ni por servicios de terceros.",
  },
  {
    question: "¿Dónde quedan guardados mis datos?",
    answer:
      "En tu propia computadora, en la carpeta de datos de usuario del sistema operativo. StockNegozia no envía tu información de productos, ventas o clientes a ningún servidor externo.",
  },
  {
    question: "¿Qué pasa si necesito recuperar información después de un error?",
    answer:
      "Podés generar copias de seguridad manuales en cualquier momento y restaurarlas con doble confirmación. Antes de restaurar, el sistema crea automáticamente un backup de resguardo y revierte los cambios si algo falla a mitad de camino.",
  },
  {
    question: "¿Cada movimiento de stock queda registrado?",
    answer:
      "Sí. Cada venta, compra o ajuste manual que modifica el stock genera un movimiento auditable e inmutable, separado del stock actual, para que siempre puedas reconstruir por qué un producto tiene la cantidad que tiene.",
  },
  {
    question: "¿Quién puede acceder a la aplicación?",
    answer:
      "El acceso está protegido por credenciales por dispositivo, no por confiar en la red local. El primer dispositivo se configura durante la instalación y desde ahí se pueden emparejar o revocar dispositivos adicionales.",
  },
];
