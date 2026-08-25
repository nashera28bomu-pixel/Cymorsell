const env = require('../config/env');
const TelegramBot = require('../models/TelegramBot');
const BotConfiguration = require('../models/BotConfiguration');
const { getMe, setWebhook } = require('./telegramClient');
const { logActivity } = require('../services/activityLogService');

/**
 * Business owner provides a bot token they created via BotFather.
 * We validate it, store it (select:false field), and set the webhook.
 * We never echo the token back to the frontend.
 */
async function connectBusinessBot({ businessId, token, actorUserId }) {
  let info;
  try {
    info = await getMe(token);
  } catch (err) {
    const e = new Error('Could not validate this bot token with Telegram. Double-check it was copied correctly from BotFather.');
    e.status = 400;
    throw e;
  }

  const botUsername = info.username;
  const existingForUsername = await TelegramBot.findOne({ botUsername });
  if (existingForUsername && existingForUsername.business.toString() !== businessId.toString()) {
    const e = new Error('This bot is already connected to another business.');
    e.status = 409;
    throw e;
  }

  let botDoc = await TelegramBot.findOne({ business: businessId });
  if (botDoc) {
    botDoc.token = token;
    botDoc.botUsername = botUsername;
    botDoc.isVerified = true;
  } else {
    botDoc = new TelegramBot({ business: businessId, token, botUsername, isVerified: true });
  }
  await botDoc.save();

  const webhookUrl = `${env.BACKEND_URL}/api/telegram/webhook/business/${botDoc._id}`;
  try {
    await setWebhook(token, webhookUrl);
    botDoc.webhookSet = true;
    botDoc.lastError = undefined;
  } catch (err) {
    botDoc.webhookSet = false;
    botDoc.lastError = err.message;
  }
  await botDoc.save();

  await BotConfiguration.findOneAndUpdate(
    { business: businessId },
    { isActive: botDoc.webhookSet },
    { upsert: true }
  );

  await logActivity({ business: businessId, actor: actorUserId, action: 'BOT_CONNECTED', meta: { botUsername } });

  return botDoc.toPublicObject();
}

async function getBusinessBotStatus(businessId) {
  const botDoc = await TelegramBot.findOne({ business: businessId });
  return botDoc ? botDoc.toPublicObject() : null;
}

module.exports = { connectBusinessBot, getBusinessBotStatus };
