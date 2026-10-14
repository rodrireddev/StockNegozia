import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import type { SalePaymentDto } from "@stocknegozia/api-contracts";
import { describePayment, formatMoney } from "@stocknegozia/shared";
import { getBusinessName } from "@/features/settings/data/businessName";

export interface ReceiptSale {
  id: number;
  createdAt: string;
  total: number;
  /** Opcional: ventas sin medio de pago registrado no muestran la sección "Forma de pago". */
  payments?: Pick<
    SalePaymentDto,
    | "method"
    | "amount"
    | "installments"
    | "cardBrand"
    | "reference"
    | "amountReceived"
    | "change"
    | "surchargePercent"
    | "surchargeAmount"
  >[];
}

export interface ReceiptLine {
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

const dateFormatter = new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" });

/** Puntos/píxeles por milímetro a 72 DPI — misma unidad que usa `expo-print` para `width`/`height`
 *  y pdfkit para sus puntos (ver apps/backend/src/core/sales/sale-receipt.pdf.ts). */
const MM = 2.83465;

/** Ancho de rollo de ticket térmico del negocio — mismo valor que el backend. Ajustable acá si el
 *  papel real resulta ser 80mm en vez de 100mm. */
const RECEIPT_WIDTH_MM = 100;
const PAGE_WIDTH_PX = Math.round(RECEIPT_WIDTH_MM * MM);

/** No hay una API de medición de texto disponible del lado HTML/RN (a diferencia de
 *  `heightOfString` de pdfkit en el backend) — se estima el alto con valores generosos que
 *  contemplan nombres de producto largos envueltos a 2 líneas. El peor caso es algo de espacio en
 *  blanco al final, nunca contenido cortado. */
const HEADER_HEIGHT_PX = 170;
const ITEM_HEIGHT_PX = 70;
const FOOTER_HEIGHT_PX = 90;
const PAYMENT_HEIGHT_PX = 45;

function estimateReceiptHeight(itemCount: number, paymentCount: number): number {
  return (
    HEADER_HEIGHT_PX +
    itemCount * ITEM_HEIGHT_PX +
    (paymentCount > 0 ? 30 + paymentCount * PAYMENT_HEIGHT_PX : 0) +
    FOOTER_HEIGHT_PX
  );
}

/** Mismo layout que el recibo del backend (ver apps/backend/src/core/sales/sale-receipt.pdf.ts):
 *  ticket angosto de 10cm con letra grande — nombre de producto arriba, cantidad/precio con el
 *  importe a la derecha abajo, en vez de una tabla de columnas que no entra en ese ancho. Se
 *  genera on-device porque mobile-mini no tiene backend. */
export function buildReceiptHtml(
  sale: ReceiptSale,
  lines: ReceiptLine[],
  businessName: string,
): string {
  const rows = lines
    .map(
      (line) => `
        <div class="item">
          <div class="item-name">${line.name} (${line.sku})</div>
          <div class="item-detail">
            <span>${line.quantity} x ${formatMoney(line.unitPrice)}</span>
            <span>${formatMoney(line.subtotal)}</span>
          </div>
        </div>`,
    )
    .join("");

  const payments = sale.payments ?? [];
  const surcharge = payments.reduce((sum, payment) => sum + (payment.surchargeAmount ?? 0), 0);
  const paymentRows = payments
    .map(
      (payment) => `
        <div class="payment">
          <span>${describePayment(payment)}</span>
          ${payments.length > 1 ? `<span>${formatMoney(payment.amount)}</span>` : ""}
        </div>
        ${
          payment.method === "cash" && payment.amountReceived !== null
            ? `<div class="payment-note">Recibido ${formatMoney(payment.amountReceived)} · vuelto ${formatMoney(payment.change ?? 0)}</div>`
            : ""
        }`,
    )
    .join("");

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          * { box-sizing: border-box; }
          body { font-family: Helvetica, Arial, sans-serif; margin: 0; padding: 12px; color: #000; }
          h1 { font-size: 24px; margin: 0; text-align: center; }
          h2 { font-size: 16px; font-weight: normal; margin: 4px 0 0; text-align: center; }
          .disclaimer { font-size: 11px; color: #555; margin: 4px 0 0; text-align: center; }
          .meta { font-size: 15px; margin: 14px 0 0; }
          hr { border: none; border-top: 1px solid #999; margin: 10px 0; }
          .item { margin-bottom: 8px; }
          .item-name { font-size: 16px; font-weight: bold; }
          .item-detail { display: flex; justify-content: space-between; font-size: 15px; }
          .total { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; font-size: 22px; font-weight: bold; margin-top: 4px; }
          .total span:last-child { text-align: right; word-break: break-all; }
          .payments-title { font-size: 14px; font-weight: bold; margin: 12px 0 2px; }
          .payment { display: flex; justify-content: space-between; gap: 8px; font-size: 14px; }
          .payment-note { font-size: 12px; color: #555; }
          .footer { margin-top: 16px; font-size: 12px; color: #555; text-align: center; }
        </style>
      </head>
      <body>
        <h1>${businessName}</h1>
        <h2>Comprobante de pago</h2>
        <p class="disclaimer">Documento no válido como factura</p>
        <p class="meta">
          Venta Nº ${sale.id}<br />
          Fecha: ${dateFormatter.format(new Date(sale.createdAt))}
        </p>
        <hr />
        ${rows}
        <hr />
        <div class="total">
          <span>TOTAL</span>
          <span>${formatMoney(sale.total)}</span>
        </div>
        ${paymentRows ? `<div class="payments-title">Forma de pago</div>${paymentRows}` : ""}
        ${
          surcharge > 0
            ? `<div class="payment"><span>Recargo medio de pago</span><span>${formatMoney(surcharge)}</span></div>
               <div class="total"><span>TOTAL COBRADO</span><span>${formatMoney(sale.total + surcharge)}</span></div>`
            : ""
        }
        <p class="footer">Gracias por su compra.</p>
      </body>
    </html>`;
}

/** Genera el PDF localmente (sin backend) y abre la hoja nativa de compartir/guardar — mismo
 *  mecanismo que en mobile, para que la persona lo guarde en Archivos/Downloads sin permisos
 *  extra de almacenamiento. */
export async function generateAndShareReceipt(
  sale: ReceiptSale,
  lines: ReceiptLine[],
): Promise<void> {
  const businessName = (await getBusinessName()) ?? "StockNegozia";
  // `expo-print` deja el PDF en un directorio temporal propio (bajo Expo Go, del proceso del
  // cliente de Expo) al que a veces ni la propia app puede leer/copiar — produce
  // `java.io.IOException: ... isn't readable` al intentar `copyAsync`, o el error de permisos de
  // `expo-sharing` si se comparte directamente. Pedirle el contenido en base64 evita tener que leer
  // ese archivo temporal: se escribe de cero en `documentDirectory`, un directorio propio de la app
  // que sí es legible/compartible (mismo criterio que mobile, que descarga el PDF directamente ahí).
  const { base64 } = await Print.printToFileAsync({
    html: buildReceiptHtml(sale, lines, businessName),
    width: PAGE_WIDTH_PX,
    height: estimateReceiptHeight(lines.length, sale.payments?.length ?? 0),
    base64: true,
  });
  if (!base64) throw new Error("No se pudo generar el contenido del recibo.");

  const destinationUri = `${FileSystem.documentDirectory}recibo-venta-${sale.id}.pdf`;
  await FileSystem.writeAsStringAsync(destinationUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(destinationUri, {
      mimeType: "application/pdf",
      dialogTitle: "Guardar recibo",
    });
  }
}
