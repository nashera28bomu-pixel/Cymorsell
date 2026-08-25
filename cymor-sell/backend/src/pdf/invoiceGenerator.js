const { renderCommerceDocument } = require('./documentGenerator');

async function generateInvoice(order, business, paymentSettings) {
  return renderCommerceDocument({
    kind: 'INVOICE',
    docNumber: order.invoiceNumber || order.orderNumber,
    order,
    business,
    paymentSettings,
  });
}

module.exports = { generateInvoice };
