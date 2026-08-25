const PDFDocument = require('pdfkit');
const { formatMoney, formatDate } = require('./pdfHelpers');

const BRAND_BLUE = '#2563eb';
const DARK = '#111827';
const GRAY = '#6b7280';
const LIGHT_BG = '#f3f4f6';

/**
 * Shared renderer for both invoices and receipts. Returns a Buffer.
 * kind: 'INVOICE' | 'RECEIPT'
 */
function renderCommerceDocument({ kind, docNumber, order, business, paymentSettings }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const brandColor = business?.invoiceBranding?.primaryColor || BRAND_BLUE;
      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

      // Header band
      doc.rect(0, 0, doc.page.width, 90).fill(brandColor);
      doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold').text(business?.name || 'Cymor Sell', 50, 30);
      doc.fontSize(10).font('Helvetica').text(business?.address || '', 50, 58);

      doc.fillColor('#ffffff').fontSize(20).font('Helvetica-Bold').text(kind, 0, 30, {
        align: 'right',
        width: pageWidth + 50,
      });
      doc.fontSize(11).font('Helvetica').text(`#${docNumber}`, 0, 58, { align: 'right', width: pageWidth + 50 });

      doc.moveDown(4);
      doc.fillColor(DARK);
      let y = 120;

      // Meta row: business contact | date/status
      doc.fontSize(9).fillColor(GRAY).text('FROM', 50, y);
      doc.fontSize(9).fillColor(GRAY).text('DATE', 320, y);
      y += 14;
      doc.fontSize(10).fillColor(DARK).font('Helvetica-Bold').text(business?.name || '', 50, y);
      doc.fontSize(10).fillColor(DARK).font('Helvetica').text(formatDate(new Date()), 320, y);
      y += 14;
      doc.fontSize(9).fillColor(GRAY).font('Helvetica').text(business?.phone || '', 50, y);
      doc.fontSize(9).fillColor(GRAY).text('STATUS', 320, y);
      y += 13;
      doc.fontSize(9).fillColor(GRAY).text(business?.email || '', 50, y);
      doc
        .fontSize(10)
        .fillColor(kind === 'RECEIPT' ? '#059669' : '#d97706')
        .font('Helvetica-Bold')
        .text(kind === 'RECEIPT' ? 'PAID ✓' : 'PENDING', 320, y);

      y += 30;

      // Bill-to box
      doc.fillColor(GRAY).fontSize(9).font('Helvetica').text('BILL TO', 50, y);
      y += 14;
      doc.fillColor(DARK).fontSize(10).font('Helvetica-Bold').text(order.customerSnapshot?.name || 'Customer', 50, y);
      y += 13;
      doc
        .fillColor(GRAY)
        .fontSize(9)
        .font('Helvetica')
        .text(order.customerSnapshot?.phone || order.customerSnapshot?.telegramUsername || '', 50, y);
      y += 13;
      doc.text(`Order #${order.orderNumber}`, 50, y);

      y += 35;

      // Table header
      const tableTop = y;
      const col = { name: 50, qty: 320, price: 390, subtotal: 470 };
      doc.rect(50, tableTop, pageWidth, 24).fill(LIGHT_BG);
      doc.fillColor(DARK).fontSize(9).font('Helvetica-Bold');
      doc.text('ITEM', col.name + 8, tableTop + 7);
      doc.text('QTY', col.qty, tableTop + 7);
      doc.text('PRICE', col.price, tableTop + 7);
      doc.text('SUBTOTAL', col.subtotal, tableTop + 7, { width: 75, align: 'right' });

      y = tableTop + 24;
      doc.font('Helvetica').fontSize(9.5);
      order.items.forEach((item, idx) => {
        const rowHeight = 22;
        if (idx % 2 === 1) {
          doc.rect(50, y, pageWidth, rowHeight).fill('#fafafa');
          doc.fillColor(DARK);
        }
        let itemLabel = item.name;
        if (item.variation) {
          const varStr = Object.entries(item.variation)
            .map(([k, v]) => `${k}: ${v}`)
            .join(', ');
          if (varStr) itemLabel += ` (${varStr})`;
        }
        doc.fillColor(DARK).text(itemLabel, col.name + 8, y + 6, { width: 260 });
        doc.text(String(item.quantity), col.qty, y + 6);
        doc.text(formatMoney(item.unitPrice), col.price, y + 6);
        doc.text(formatMoney(item.subtotal), col.subtotal, y + 6, { width: 75, align: 'right' });
        y += rowHeight;
      });

      y += 10;
      doc.moveTo(50, y).lineTo(50 + pageWidth, y).strokeColor('#e5e7eb').stroke();
      y += 12;

      const summaryX = 350;
      doc.fontSize(9.5).fillColor(GRAY).text('Items subtotal', summaryX, y);
      doc.fillColor(DARK).text(formatMoney(order.itemsTotal), col.subtotal, y, { width: 75, align: 'right' });
      y += 16;

      doc.fillColor(GRAY).text(order.deliveryMethod === 'pickup' ? 'Pickup' : `Delivery (${order.deliveryZoneName || ''})`, summaryX, y);
      doc.fillColor(DARK).text(formatMoney(order.deliveryFee), col.subtotal, y, { width: 75, align: 'right' });
      y += 20;

      doc.rect(summaryX - 10, y - 4, pageWidth - (summaryX - 50) + 10, 28).fill(brandColor);
      doc.fillColor('#ffffff').fontSize(11).font('Helvetica-Bold').text('TOTAL', summaryX, y + 4);
      doc.text(formatMoney(order.total), col.subtotal, y + 4, { width: 75, align: 'right' });
      y += 45;

      // Payment instructions (invoice only, still pending)
      if (kind === 'INVOICE' && paymentSettings) {
        doc.fillColor(DARK).fontSize(10).font('Helvetica-Bold').text('Payment Instructions', 50, y);
        y += 15;
        doc.font('Helvetica').fontSize(9.5).fillColor(GRAY);
        if (paymentSettings.mpesaNumber) {
          doc.text(`M-Pesa: ${paymentSettings.mpesaNumber}${paymentSettings.mpesaName ? ' (' + paymentSettings.mpesaName + ')' : ''}`, 50, y);
          y += 13;
        }
        if (paymentSettings.bankName) {
          doc.text(`Bank: ${paymentSettings.bankName} — ${paymentSettings.bankAccountName || ''} ${paymentSettings.bankAccountNumber || ''}`, 50, y);
          y += 13;
        }
        if (paymentSettings.otherInstructions) {
          doc.text(paymentSettings.otherInstructions, 50, y, { width: pageWidth });
          y += 20;
        }
        y += 10;
      }

      if (business?.invoiceBranding?.terms) {
        doc.fillColor(GRAY).fontSize(8).font('Helvetica').text(business.invoiceBranding.terms, 50, y, { width: pageWidth });
        y += 20;
      }

      // Footer
      const footerY = doc.page.height - 70;
      doc.moveTo(50, footerY).lineTo(50 + pageWidth, footerY).strokeColor('#e5e7eb').stroke();
      doc
        .fontSize(8.5)
        .fillColor(GRAY)
        .text(business?.invoiceBranding?.footerMessage || 'Thank you for your business!', 50, footerY + 10, {
          width: pageWidth,
          align: 'center',
        });
      doc.fontSize(7.5).fillColor('#9ca3af').text('Powered by Cymor Sell', 50, footerY + 24, {
        width: pageWidth,
        align: 'center',
      });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { renderCommerceDocument };
