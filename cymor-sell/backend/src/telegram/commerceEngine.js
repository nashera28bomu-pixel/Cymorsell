const Business = require('../models/Business');
const Product = require('../models/Product');
const Category = require('../models/Category');
const DeliveryZone = require('../models/DeliveryZone');
const PaymentSettings = require('../models/PaymentSettings');
const Session = require('../models/Session');
const { Order } = require('../models/Order');
const SystemSettings = require('../models/SystemSettings');
const orderService = require('../services/orderService');
const { calculateCart } = require('../services/cartService');
const { askGeminiWithContext } = require('../ai/gemini');
const aiRequestCounter = require('../utils/aiRequestCounter');
const { sendMessage, answerCallbackQuery, inlineKeyboard } = require('./telegramClient');

const PAGE_SIZE = 5;
const NON_AI_KEYWORDS = [
  'hi', 'hello', 'hey', 'menu', 'browse', 'category', 'categories', 'price', 'stock',
  'delivery', 'payment', 'hours', 'order', 'status', 'cart', 'total',
];

function moneyFmt(n) {
  return `KSh ${Number(n).toLocaleString('en-KE')}`;
}

function mainMenu(businessName) {
  return inlineKeyboard([
    [{ text: '🛍 Browse Products', callback_data: 'BROWSE:0' }],
    [{ text: '🔎 Find Something', callback_data: 'SEARCH_PROMPT' }],
    [{ text: '🛒 Cart', callback_data: 'CART' }],
    [{ text: '🚚 Delivery Info', callback_data: 'DELIVERY_INFO' }],
    [{ text: '💬 Talk to Us', callback_data: 'CONTACT' }],
  ]);
}

async function getSession(businessId, chatId) {
  let session = await Session.findOne({ business: businessId, chatId: String(chatId) });
  if (!session) session = await Session.create({ business: businessId, chatId: String(chatId), cart: [] });
  return session;
}

/**
 * Entry point for every update aimed at a specific business bot.
 */
async function handleCommerceUpdate({ token, business, update }) {
  const chat = update.message?.chat || update.callback_query?.message?.chat;
  if (!chat) return;
  const chatId = chat.id;

  const settings = await SystemSettings.getSettings();
  if (settings.maintenanceMode) {
    await sendMessage(token, chatId, `🛠 ${settings.maintenanceMessage}`);
    return;
  }

  const session = await getSession(business._id, chatId);
  const text = update.message?.text?.trim();
  const data = update.callback_query?.data;
  const from = update.message?.from || update.callback_query?.from;

  try {
    if (update.callback_query) {
      await answerCallbackQuery(token, update.callback_query.id, '').catch(() => {});
    }

    if (text === '/start' || data === 'MENU') {
      await sendMessage(
        token,
        chatId,
        `👋 Welcome to <b>${business.name}</b>!\n\nI'm your 24/7 shopping assistant. What would you like to do?`,
        { replyMarkup: mainMenu(business.name) }
      );
      return;
    }

    if (data?.startsWith('BROWSE:')) {
      const pageNum = parseInt(data.split(':')[1], 10) || 0;
      await sendProductPage({ token, business, chatId, page: pageNum });
      return;
    }

    if (data?.startsWith('PRODUCT:')) {
      const productId = data.split(':')[1];
      await sendProductDetail({ token, business, chatId, productId });
      return;
    }

    if (data?.startsWith('ADD:')) {
      const productId = data.split(':')[1];
      await addToCart({ token, business, session, chatId, productId });
      return;
    }

    if (data === 'CART') {
      await sendCart({ token, business, session, chatId });
      return;
    }

    if (data === 'CHECKOUT') {
      await startCheckout({ token, business, session, chatId });
      return;
    }

    if (data?.startsWith('DELIVERY_METHOD:')) {
      const method = data.split(':')[1]; // delivery | pickup
      session.checkout = { ...session.checkout, deliveryMethod: method };
      session.state = method === 'pickup' ? 'CHECKOUT_ADDRESS' : 'CHECKOUT_ZONE';
      await session.save();
      if (method === 'pickup') {
        await sendMessage(token, chatId, `Great — pickup selected. Please reply with your <b>name</b> and <b>phone number</b> so we can prepare your order.`);
      } else {
        await sendDeliveryZones({ token, business, chatId });
      }
      return;
    }

    if (data?.startsWith('ZONE:')) {
      const zoneId = data.split(':')[1];
      session.checkout = { ...session.checkout, deliveryZoneId: zoneId };
      session.state = 'CHECKOUT_ADDRESS';
      await session.save();
      await sendMessage(token, chatId, `Please reply with your <b>name</b>, <b>phone number</b>, and delivery address (one message).`);
      return;
    }

    if (data === 'CONFIRM_ORDER') {
      await finalizeOrder({ token, business, session, chatId, from });
      return;
    }

    if (data === 'EDIT_CART') {
      await sendCart({ token, business, session, chatId });
      return;
    }

    if (data === 'CANCEL_CHECKOUT') {
      session.state = 'IDLE';
      await session.save();
      await sendMessage(token, chatId, 'Checkout cancelled. Your cart is still saved.', { replyMarkup: mainMenu(business.name) });
      return;
    }

    if (data?.startsWith('IVE_PAID:')) {
      const orderId = data.split(':')[1];
      await handleIvePaid({ token, business, chatId, orderId });
      return;
    }

    if (data === 'DELIVERY_INFO') {
      await sendDeliveryZones({ token, business, chatId, infoOnly: true });
      return;
    }

    if (data === 'CONTACT') {
      await sendMessage(token, chatId, `📞 ${business.phone || 'Contact info not set'}\n✉️ ${business.email || ''}`);
      return;
    }

    if (data === 'SEARCH_PROMPT') {
      await sendMessage(token, chatId, 'What are you looking for? Just type a product name or keyword.');
      return;
    }

    // Free-text handling
    if (text) {
      if (session.state === 'CHECKOUT_ADDRESS') {
        session.checkout = { ...session.checkout, deliveryAddress: text };
        session.state = 'CHECKOUT_CONFIRM';
        await session.save();
        await sendOrderReview({ token, business, session, chatId });
        return;
      }

      // Deterministic keyword handling first
      const lower = text.toLowerCase();
      if (NON_AI_KEYWORDS.some((k) => lower === k || lower.includes(k))) {
        await handleDeterministicText({ token, business, chatId, lower });
        return;
      }

      // Otherwise: search products, and if nothing obvious matches, use Gemini
      const matches = await Product.find({
        business: business._id,
        isActive: true,
        $text: { $search: text },
      }).limit(5);

      if (matches.length > 0) {
        await sendMessage(token, chatId, `Here's what I found for "${text}":`);
        for (const p of matches) await sendProductCard({ token, chatId, product: p });
        return;
      }

      await handleAiQuestion({ token, business, chatId, question: text });
    }
  } catch (err) {
    console.error('[commerceEngine] error handling update:', err.message);
    await sendMessage(token, chatId, '⚠️ Something went wrong on our end. Please try again, or use /start to reset.').catch(() => {});
  }
}

async function handleDeterministicText({ token, business, chatId, lower }) {
  if (['hi', 'hello', 'hey', 'menu'].some((k) => lower === k)) {
    await sendMessage(token, chatId, `Hi there! What would you like to do?`, { replyMarkup: mainMenu(business.name) });
    return;
  }
  if (lower.includes('hours')) {
    await sendMessage(token, chatId, `🕒 Opening hours: ${business.openingHours || 'Not set'}`);
    return;
  }
  if (lower.includes('delivery')) {
    await sendDeliveryZones({ token, business, chatId, infoOnly: true });
    return;
  }
  if (lower.includes('payment')) {
    const ps = await PaymentSettings.findOne({ business: business._id });
    await sendMessage(token, chatId, formatPaymentInstructions(ps, 0));
    return;
  }
  await sendMessage(token, chatId, `Here's the menu:`, { replyMarkup: mainMenu(business.name) });
}

async function sendProductPage({ token, business, chatId, page }) {
  const skip = page * PAGE_SIZE;
  const [products, total] = await Promise.all([
    Product.find({ business: business._id, isActive: true }).sort({ createdAt: -1 }).skip(skip).limit(PAGE_SIZE),
    Product.countDocuments({ business: business._id, isActive: true }),
  ]);

  if (products.length === 0) {
    await sendMessage(token, chatId, page === 0 ? 'No products available yet.' : "That's the end of the list.");
    return;
  }

  for (const p of products) {
    await sendProductCard({ token, chatId, product: p });
  }

  const navRow = [];
  if (page > 0) navRow.push({ text: '⬅ Prev', callback_data: `BROWSE:${page - 1}` });
  if (skip + PAGE_SIZE < total) navRow.push({ text: 'Next ➡', callback_data: `BROWSE:${page + 1}` });
  const rows = navRow.length ? [navRow, [{ text: '🛒 View Cart', callback_data: 'CART' }]] : [[{ text: '🛒 View Cart', callback_data: 'CART' }]];
  await sendMessage(token, chatId, `Page ${page + 1} of ${Math.ceil(total / PAGE_SIZE)}`, { replyMarkup: inlineKeyboard(rows) });
}

async function sendProductCard({ token, chatId, product }) {
  const stockLine = product.stock > 0 ? `📦 In stock: ${product.stock}` : '❌ Out of stock';
  const text = `<b>${product.name}</b>\n${moneyFmt(product.price)}\n\n${product.description || ''}\n\n${stockLine}`;
  const rows = [[{ text: 'ℹ️ Details', callback_data: `PRODUCT:${product._id}` }]];
  if (product.stock > 0) rows[0].push({ text: '➕ Add to Cart', callback_data: `ADD:${product._id}` });
  await sendMessage(token, chatId, text, { replyMarkup: inlineKeyboard(rows) });
}

async function sendProductDetail({ token, business, chatId, productId }) {
  const product = await Product.findOne({ _id: productId, business: business._id });
  if (!product) return sendMessage(token, chatId, 'Product not found.');
  let variationLines = '';
  for (const v of product.variations || []) {
    variationLines += `\n${v.type}: ${v.options.join(' | ')}`;
  }
  const text = `<b>${product.name}</b>\n${moneyFmt(product.price)}\n\n${product.description || ''}${variationLines}\n\n📦 In stock: ${product.stock}`;
  const rows = product.stock > 0 ? [[{ text: '➕ Add to Cart', callback_data: `ADD:${product._id}` }]] : [];
  await sendMessage(token, chatId, text, { replyMarkup: rows.length ? inlineKeyboard(rows) : undefined });
}

async function addToCart({ token, business, session, chatId, productId }) {
  const product = await Product.findOne({ _id: productId, business: business._id });
  if (!product || product.stock < 1) {
    await sendMessage(token, chatId, 'Sorry, this item is not available.');
    return;
  }
  const existing = session.cart.find((i) => i.productId === productId);
  if (existing) existing.quantity += 1;
  else session.cart.push({ productId, quantity: 1 });
  await session.save();
  await sendMessage(token, chatId, `✅ Added <b>${product.name}</b> to your cart.`, {
    replyMarkup: inlineKeyboard([
      [{ text: '🛒 View Cart', callback_data: 'CART' }],
      [{ text: '🛍 Keep Browsing', callback_data: 'BROWSE:0' }],
    ]),
  });
}

async function sendCart({ token, business, session, chatId }) {
  if (!session.cart.length) {
    await sendMessage(token, chatId, 'Your cart is empty.', { replyMarkup: mainMenu(business.name) });
    return;
  }
  try {
    const cart = await calculateCart({
      businessId: business._id,
      items: session.cart,
      deliveryMethod: 'pickup', // just for item total preview; real delivery chosen at checkout
    });
    let text = `🛒 <b>Your Cart</b>\n\n`;
    for (const line of cart.lineItems) {
      text += `${line.name} × ${line.quantity} — ${moneyFmt(line.subtotal)}\n`;
    }
    text += `\nItems total: ${moneyFmt(cart.itemsTotal)}`;
    await sendMessage(token, chatId, text, {
      replyMarkup: inlineKeyboard([
        [{ text: '✅ Checkout', callback_data: 'CHECKOUT' }],
        [{ text: '🛍 Keep Browsing', callback_data: 'BROWSE:0' }],
      ]),
    });
  } catch (err) {
    await sendMessage(token, chatId, `⚠️ ${err.message}`);
  }
}

async function startCheckout({ token, business, session, chatId }) {
  if (!session.cart.length) {
    await sendMessage(token, chatId, 'Your cart is empty.');
    return;
  }
  session.state = 'CHECKOUT_METHOD';
  await session.save();
  await sendMessage(token, chatId, 'How would you like to receive your order?', {
    replyMarkup: inlineKeyboard([
      [{ text: '🚚 Delivery', callback_data: 'DELIVERY_METHOD:delivery' }],
      [{ text: '🏬 Pickup', callback_data: 'DELIVERY_METHOD:pickup' }],
    ]),
  });
}

async function sendDeliveryZones({ token, business, chatId, infoOnly }) {
  const zones = await DeliveryZone.find({ business: business._id, isActive: true, isPickup: false });
  if (infoOnly) {
    let text = '🚚 <b>Delivery Zones</b>\n\n';
    if (!zones.length) text += 'No delivery zones configured yet.';
    for (const z of zones) text += `${z.name} — ${moneyFmt(z.fee)}${z.estimatedTime ? ` (${z.estimatedTime})` : ''}\n`;
    await sendMessage(token, chatId, text);
    return;
  }
  if (!zones.length) {
    await sendMessage(token, chatId, 'No delivery zones are configured — please choose pickup instead.');
    return;
  }
  const rows = zones.map((z) => [{ text: `${z.name} — ${moneyFmt(z.fee)}`, callback_data: `ZONE:${z._id}` }]);
  await sendMessage(token, chatId, 'Choose your delivery zone:', { replyMarkup: inlineKeyboard(rows) });
}

async function sendOrderReview({ token, business, session, chatId }) {
  try {
    const cart = await calculateCart({
      businessId: business._id,
      items: session.cart,
      deliveryMethod: session.checkout.deliveryMethod,
      deliveryZoneId: session.checkout.deliveryZoneId,
    });
    let text = `🧾 <b>REVIEW YOUR ORDER</b>\n\n`;
    for (const line of cart.lineItems) text += `${line.name} × ${line.quantity} — ${moneyFmt(line.subtotal)}\n`;
    text += `\n${session.checkout.deliveryMethod === 'pickup' ? 'Pickup' : cart.deliveryZoneName} — ${moneyFmt(cart.deliveryFee)}\n`;
    text += `\n<b>TOTAL: ${moneyFmt(cart.total)}</b>`;
    await sendMessage(token, chatId, text, {
      replyMarkup: inlineKeyboard([
        [{ text: '✓ Confirm Order', callback_data: 'CONFIRM_ORDER' }],
        [{ text: '✏ Edit Cart', callback_data: 'EDIT_CART' }],
        [{ text: '❌ Cancel', callback_data: 'CANCEL_CHECKOUT' }],
      ]),
    });
  } catch (err) {
    await sendMessage(token, chatId, `⚠️ ${err.message}`);
  }
}

function parseNameAndPhone(text) {
  // Best-effort: first line/segment as name, look for a phone-like token.
  const phoneMatch = text.match(/(\+?\d[\d\s-]{6,})/);
  const phone = phoneMatch ? phoneMatch[1].trim() : '';
  const name = text.replace(phone, '').trim() || 'Customer';
  return { name, phone };
}

async function finalizeOrder({ token, business, session, chatId, from }) {
  const { name, phone } = parseNameAndPhone(session.checkout.deliveryAddress || '');
  try {
    const { order } = await orderService.createOrderFromCart({
      businessId: business._id,
      customerInput: {
        telegramUserId: String(from?.id || chatId),
        telegramUsername: from?.username,
        name: from?.first_name || name,
        phone,
      },
      items: session.cart,
      deliveryMethod: session.checkout.deliveryMethod,
      deliveryZoneId: session.checkout.deliveryZoneId,
      deliveryAddress: session.checkout.deliveryAddress,
    });

    session.cart = [];
    session.state = 'IDLE';
    session.checkout = {};
    await session.save();

    const ps = await PaymentSettings.findOne({ business: business._id });
    await sendMessage(
      token,
      chatId,
      `✅ Order <b>#${order.orderNumber}</b> created!\n\n${formatPaymentInstructions(ps, order.total)}`,
      { replyMarkup: inlineKeyboard([[{ text: "I've Paid ✅", callback_data: `IVE_PAID:${order._id}` }]]) }
    );

    await notifyOwnerNewOrder({ business, order });
  } catch (err) {
    await sendMessage(token, chatId, `⚠️ Could not create order: ${err.message}`);
  }
}

function formatPaymentInstructions(ps, total) {
  let text = `💳 <b>PAYMENT INSTRUCTIONS</b>\n\n`;
  if (total) text += `Send ${moneyFmt(total)} to:\n\n`;
  if (ps?.mpesaNumber) text += `M-Pesa: <b>${ps.mpesaNumber}</b>${ps.mpesaName ? ` (${ps.mpesaName})` : ''}\n`;
  if (ps?.bankName) text += `Bank: ${ps.bankName} — ${ps.bankAccountName || ''} ${ps.bankAccountNumber || ''}\n`;
  if (ps?.otherInstructions) text += `${ps.otherInstructions}\n`;
  text += `\nAfter paying, tap "I've Paid" below.`;
  return text;
}

// IMPORTANT: this only moves the order to PAYMENT_VERIFICATION and notifies the
// owner. It NEVER marks the order PAID - only the business owner can do that.
async function handleIvePaid({ token, business, chatId, orderId }) {
  const order = await orderService.markAwaitingVerification(orderId, business._id);
  if (!order) {
    await sendMessage(token, chatId, 'This order was already processed or not found.');
    return;
  }
  await sendMessage(
    token,
    chatId,
    `🙏 Thanks! We've notified <b>${business.name}</b> to verify your payment for order #${order.orderNumber}. You'll get a message once it's confirmed.`
  );
  await notifyOwnerPaymentClaim({ business, order });
}

async function notifyOwnerNewOrder({ business, order }) {
  const owner = require('../models/User');
  const user = await owner.findById(business.owner);
  if (!user?.telegramUserId) return;
  const { sendBroadcastMessage } = require('./mainBot');
  await sendBroadcastMessage(
    user.telegramUserId,
    `🆕 New order #${order.orderNumber} for ${business.name} — ${moneyFmt(order.total)}. Check your dashboard to review.`
  ).catch(() => {});
}

async function notifyOwnerPaymentClaim({ business, order }) {
  const owner = require('../models/User');
  const user = await owner.findById(business.owner);
  if (!user?.telegramUserId) return;
  const { sendBroadcastMessage } = require('./mainBot');
  await sendBroadcastMessage(
    user.telegramUserId,
    `💰 Payment claimed for order #${order.orderNumber} (${moneyFmt(order.total)}). Please verify and confirm/reject it from your dashboard.`
  ).catch(() => {});
}

async function handleAiQuestion({ token, business, chatId, question }) {
  const products = await Product.find({ business: business._id, isActive: true }).populate('category').limit(50);
  const zones = await DeliveryZone.find({ business: business._id, isActive: true });

  const result = await askGeminiWithContext({ question, business, products, deliveryZones: zones });
  if (result.ok) {
    aiRequestCounter.increment();
    await sendMessage(token, chatId, result.text);
  } else {
    await sendMessage(
      token,
      chatId,
      `Our AI assistant is temporarily unavailable, but you can browse our products below.`,
      { replyMarkup: mainMenu(business.name) }
    );
  }
}

module.exports = { handleCommerceUpdate };
