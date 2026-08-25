const { renderCommerceDocument } = require('./documentGenerator');

async function generateReceipt(order, business) {
  return renderCommerceDocument({
    kind: 'RECEIPT',
    docNumber: order.receiptNumber || order.orderNumber,
    order,
    business,
    paymentSettings: null,
  });
}

module.exports = { generateReceipt };
