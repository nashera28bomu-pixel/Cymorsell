const Product = require('../models/Product');
const DeliveryZone = require('../models/DeliveryZone');

// Server-side authoritative cart total calculation.
// `items` = [{ productId, quantity, variation }] coming from client/bot -
// price and stock are NEVER trusted from the client.
async function calculateCart({ businessId, items, deliveryZoneId, deliveryMethod }) {
  if (!items || items.length === 0) {
    const err = new Error('Cart is empty');
    err.status = 400;
    throw err;
  }

  const productIds = items.map((i) => i.productId);
  const products = await Product.find({ _id: { $in: productIds }, business: businessId, isActive: true });
  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  const lineItems = [];
  let itemsTotal = 0;

  for (const item of items) {
    const product = productMap.get(item.productId.toString());
    if (!product) {
      const err = new Error(`Product not found or unavailable: ${item.productId}`);
      err.status = 400;
      throw err;
    }
    const quantity = Math.max(1, parseInt(item.quantity, 10) || 1);
    if (product.stock < quantity) {
      const err = new Error(`${product.name} is out of stock (available: ${product.stock})`);
      err.status = 400;
      throw err;
    }
    const subtotal = product.price * quantity;
    itemsTotal += subtotal;
    lineItems.push({
      product: product._id,
      name: product.name,
      unitPrice: product.price,
      quantity,
      variation: item.variation || null,
      subtotal,
    });
  }

  let deliveryFee = 0;
  let deliveryZoneName = 'Pickup';
  if (deliveryMethod === 'delivery') {
    if (!deliveryZoneId) {
      const err = new Error('Delivery zone is required for delivery orders');
      err.status = 400;
      throw err;
    }
    const zone = await DeliveryZone.findOne({ _id: deliveryZoneId, business: businessId, isActive: true });
    if (!zone) {
      const err = new Error('Invalid delivery zone');
      err.status = 400;
      throw err;
    }
    deliveryFee = zone.fee;
    deliveryZoneName = zone.name;
  }

  const total = itemsTotal + deliveryFee;

  return { lineItems, itemsTotal, deliveryFee, deliveryZoneName, total };
}

module.exports = { calculateCart };
