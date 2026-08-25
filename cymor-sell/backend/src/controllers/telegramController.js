const TelegramBot = require('../models/TelegramBot');
const Business = require('../models/Business');
const botManager = require('../telegram/botManager');
const mainBot = require('../telegram/mainBot');
const commerceEngine = require('../telegram/commerceEngine');

async function connectBot(req, res, next) {
  try {
    const { token, botUsername } = req.body;
    if (!token) return res.status(400).json({ error: 'Bot token is required' });
    const result = await botManager.connectBusinessBot({ businessId: req.businessId, token, actorUserId: req.user._id });
    res.json({ bot: result });
  } catch (err) {
    next(err);
  }
}

async function getBotStatus(req, res, next) {
  try {
    const bot = await botManager.getBusinessBotStatus(req.businessId);
    res.json({ bot });
  } catch (err) {
    next(err);
  }
}

// Webhook for the main @CymorSellBot (business-owner-facing management bot)
async function mainWebhook(req, res) {
  res.status(200).json({ ok: true }); // ack immediately, Telegram requires fast response
  try {
    await mainBot.handleMainBotUpdate(req.body);
  } catch (err) {
    console.error('[telegram] main webhook error:', err.message);
  }
}

// Webhook for a specific business's sales bot, identified by our internal bot id in the URL
// (never the raw token — the token stays server-side only).
async function businessWebhook(req, res) {
  res.status(200).json({ ok: true });
  try {
    const botDoc = await TelegramBot.findById(req.params.botId).select('+token');
    if (!botDoc || !botDoc.isActive) return;
    const business = await Business.findById(botDoc.business);
    if (!business || !business.isActive) return;

    await commerceEngine.handleCommerceUpdate({ token: botDoc.token, business, update: req.body });
  } catch (err) {
    console.error('[telegram] business webhook error:', err.message);
  }
}

module.exports = { connectBot, getBotStatus, mainWebhook, businessWebhook };
