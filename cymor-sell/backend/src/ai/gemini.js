const { GoogleGenerativeAI } = require('@google/generative-ai');
const env = require('../config/env');

let client = null;
function getClient() {
  if (!env.GEMINI_API_KEY) return null;
  if (!client) client = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  return client;
}

/**
 * Ask Gemini a commerce question, grounded ONLY in the business data we pass it.
 * Returns { ok: true, text } on success, or { ok: false, reason } if Gemini is
 * unavailable/erroring — callers MUST fall back to normal commerce flow, never
 * let this take the bot down.
 */
async function askGeminiWithContext({ question, business, products, deliveryZones }) {
  const genAI = getClient();
  if (!genAI) {
    return { ok: false, reason: 'AI is not configured' };
  }

  const context = {
    businessName: business.name,
    businessDescription: business.description,
    policies: business.salesAgent?.policies,
    faq: business.salesAgent?.faq,
    products: products.map((p) => ({
      name: p.name,
      price: p.price,
      stock: p.stock,
      description: p.description,
      category: p.category?.name,
    })),
    deliveryZones: deliveryZones.map((z) => ({ name: z.name, fee: z.fee, isPickup: z.isPickup })),
  };

  const prompt = `You are the sales assistant for "${business.name}" on Cymor Sell, a Telegram commerce platform.
ONLY use the JSON data below to answer. NEVER invent products, prices, stock levels, discounts, delivery fees, or policies that are not present in this data. If the data doesn't contain the answer, say you're not sure and suggest the customer browse products or contact the business directly.
Keep answers short and friendly, suitable for a Telegram chat on mobile.

BUSINESS DATA:
${JSON.stringify(context)}

CUSTOMER QUESTION:
${question}`;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return { ok: true, text };
  } catch (err) {
    console.error('[gemini] request failed:', err.message);
    return { ok: false, reason: 'AI is temporarily unavailable' };
  }
}

module.exports = { askGeminiWithContext };
