import PDFDocument from "pdfkit";

export interface ReceiptLine {
  productName: string;
  productSku: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface ReceiptSale {
  id: number;
  total: number;
  createdAt: Date;
  status: "completed" | "cancelled";
}

const currencyFormatter = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });
const dateFormatter = new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" });

/** Puntos por milímetro a 72 DPI (unidad nativa de pdfkit). */
const MM = 2.83465;

/** Ancho de rollo de ticket térmico del negocio — ver docs de facturación provisoria. Ajustable acá
 *  si el papel real resulta ser 80mm en vez de 100mm. */
const RECEIPT_WIDTH_MM = 100;
const PAGE_WIDTH = RECEIPT_WIDTH_MM * MM;
const MARGIN = 4 * MM;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

function drawDivider(doc: PDFKit.PDFDocument): void {
  doc
    .moveTo(MARGIN, doc.y)
    .lineTo(PAGE_WIDTH - MARGIN, doc.y)
    .strokeColor("#999999")
    .stroke()
    .fillColor("#000000");
}

/**
 * Dibuja el recibo completo — se llama dos veces (ver `renderSaleReceiptPdf`): una vez sobre un
 * documento descartable sólo para medir cuánto alto hace falta, y otra sobre el documento real ya
 * con ese alto exacto. Tickets angostos (10cm) muestran cada ítem en dos líneas — nombre arriba,
 * "cant x precio unitario" con el subtotal a la derecha abajo — en vez de una tabla de columnas
 * que no entra en ese ancho.
 */
function drawReceiptContent(
  doc: PDFKit.PDFDocument,
  sale: ReceiptSale,
  lines: ReceiptLine[],
  businessName: string,
): void {
  doc
    .font("Helvetica-Bold")
    .fontSize(20)
    .text(businessName, MARGIN, MARGIN, { width: CONTENT_WIDTH, align: "center" });
  doc
    .font("Helvetica")
    .fontSize(13)
    .text("Comprobante de pago", { width: CONTENT_WIDTH, align: "center" });
  doc
    .fontSize(9)
    .fillColor("#555555")
    .text("Documento no válido como factura", { width: CONTENT_WIDTH, align: "center" });
  doc.fillColor("#000000");

  doc.moveDown(0.8);
  doc.fontSize(12).text(`Venta Nº ${sale.id}`, { width: CONTENT_WIDTH });
  doc.text(`Fecha: ${dateFormatter.format(sale.createdAt)}`, { width: CONTENT_WIDTH });
  if (sale.status === "cancelled") {
    doc.fillColor("#b91c1c").text("VENTA CANCELADA", { width: CONTENT_WIDTH });
    doc.fillColor("#000000");
  }

  doc.moveDown(0.5);
  drawDivider(doc);
  doc.moveDown(0.4);

  for (const line of lines) {
    doc
      .font("Helvetica-Bold")
      .fontSize(13)
      .text(`${line.productName} (${line.productSku})`, MARGIN, doc.y, { width: CONTENT_WIDTH });

    const detailY = doc.y;
    doc.font("Helvetica").fontSize(12);
    doc.text(`${line.quantity} x ${currencyFormatter.format(line.unitPrice)}`, MARGIN, detailY, {
      width: CONTENT_WIDTH * 0.55,
    });
    doc.text(currencyFormatter.format(line.subtotal), MARGIN, detailY, {
      width: CONTENT_WIDTH,
      align: "right",
    });
    doc.moveDown(0.6);
  }

  drawDivider(doc);
  doc.moveDown(0.4);

  doc.font("Helvetica-Bold").fontSize(18);
  const totalY = doc.y;
  doc.text("TOTAL", MARGIN, totalY, { width: CONTENT_WIDTH * 0.5 });
  doc.text(currencyFormatter.format(sale.total), MARGIN, totalY, {
    width: CONTENT_WIDTH,
    align: "right",
  });

  doc.moveDown(1.2);
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#555555")
    .text("Gracias por su compra.", { width: CONTENT_WIDTH, align: "center" });
}

/**
 * Recibo de venta simplificado y no fiscal — es un modelo provisorio para pruebas. pdfkit es pura
 * JS (sin bindings nativos), a diferencia de better-sqlite3 que ya requiere manejo de binarios
 * nativos en el empaquetado.
 */
export function renderSaleReceiptPdf(
  sale: ReceiptSale,
  lines: ReceiptLine[],
  businessName = "StockNegozia",
): Promise<Buffer> {
  // Paso 1: documento descartable con un alto provisorio muy grande, usado sólo para medir cuánto
  // espacio ocupa el contenido real (nombres de producto largos pueden envolver a más de una
  // línea) — pdfkit no soporta alto de página "automático". Nunca se llama `.end()` ni se hace
  // pipe de este documento: se descarta apenas se lee `doc.y`.
  const measurer = new PDFDocument({ margin: 0, size: [PAGE_WIDTH, 10_000] });
  drawReceiptContent(measurer, sale, lines, businessName);
  const contentHeight = measurer.y + MARGIN;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 0, size: [PAGE_WIDTH, contentHeight] });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    drawReceiptContent(doc, sale, lines, businessName);
    doc.end();
  });
}
