const env = require('../config/env');
const User = require('../models/User');
const Business = require('../models/Business');
const { sendMessage, inlineKeyboard, setWebhook } = require('./telegramClient');

const TOKEN = () => env.TELEGRAM_MAIN_BOT_TOKEN;

async function initMainBotWebhook() {
  if (!TOKEN()) {
    console.warn('[mainBot] TELEGRAM_MAIN_BOT_TOKEN not set - management bot disabled');
    return;
  }
  const url = `${env.BACKEND_URL}/api/telegram/webhook/main`;
  await setWebhook(TOKEN(), url);
  console.log('[mainBot] webhook set to', url);
}

function mainMenuKeyboard() {
  return inlineKeyboard([
    [{ text: '🚀 Create My Business', callback_data: 'CREATE_BUSINESS' }],
    [{ text: '📊 My Dashboard', callback_data: 'DASHBOARD' }],
    [{ text: '🏪 My Business', callback_data: 'MY_BUSINESS' }],
    [{ text: '❓ How It Works', callback_data: 'HOW_IT_WORKS' }],
    [{ text: '🆘 Support', callback_data: 'SUPPORT' }],
  ]);
}

async function linkOrGetUser(telegramUserId, telegramUsername) {
  let user = await User.findOne({ telegramUserId: String(telegramUserId) });
  return user;
}

async function handleMainBotUpdate(update) {
  if (!TOKEN()) return;

  const chat = update.message?.chat || update.callback_query?.message?.chat;
  if (!chat) return;
  const chatId = chat.id;
  const fromId = update.message?.from?.id || update.callback_query?.from?.id;
  const fromUsername = update.message?.from?.username || update.callback_query?.from?.username;

  const text = update.message?.text;
  const data = update.callback_query?.data;

  if (text === '/start' || data === 'MENU') {
    await sendMessage(
      TOKEN(),
      chatId,
      `👋 Welcome to <b>Cymor Sell</b>!\n\n<i>Your business. Your products. Your 24/7 sales agent.</i>\n\nWhat would you like to do?`,
      { replyMarkup: mainMenuKeyboard() }
    );
    return;
  }

  if (data === 'CREATE_BUSINESS' || data === 'DASHBOARD') {
    const link = `${env.FRONTEND_URL}/auth?telegram_id=${fromId}&telegram_username=${fromUsername || ''}`;
    await sendMessage(
      TOKEN(),
      chatId,
      `Head to the Cymor Sell dashboard to ${data === 'CREATE_BUSINESS' ? 'create your business' : 'view your dashboard'}:\n\n${link}`
    );
    return;
  }

  if (data === 'MY_BUSINESS') {
    const user = await linkOrGetUser(fromId, fromUsername);
    if (!user?.business) {
      await sendMessage(TOKEN(), chatId, `You don't have a business yet. Tap "🚀 Create My Business" to get started.`, {
        replyMarkup: mainMenuKeyboard(),
      });
      return;
    }
    const business = await Business.findById(user.business);
    await sendMessage(
      TOKEN(),
      chatId,
      `🏪 <b>${business.name}</b>\n${business.description || ''}\n\nManage it from your dashboard: ${env.FRONTEND_URL}/dashboard`
    );
    return;
  }

  if (data === 'HOW_IT_WORKS') {
    await sendMessage(
      TOKEN(),
      chatId,
      `1️⃣ Create your business on the web dashboard\n2️⃣ Add your products (manually or via CSV)\n3️⃣ Set delivery & payment details\n4️⃣ Connect your own Telegram bot (via BotFather)\n5️⃣ Customers order directly from your bot — you confirm payments and manage orders from your dashboard.`
    );
    return;
  }

  if (data === 'SUPPORT') {
    await sendMessage(TOKEN(), chatId, `Need help? Reach us at support@cymorsell.com`);
    return;
  }

  // Fallback
  await sendMessage(TOKEN(), chatId, `I didn't catch that. Here's the menu:`, { replyMarkup: mainMenuKeyboard() });
}

async function sendBroadcastMessage(telegramUserId, message) {
  if (!TOKEN()) throw new Error('Main bot not configured');
  if (!telegramUserId) throw new Error('User has no linked Telegram ID');
  await sendMessage(TOKEN(), telegramUserId, `📢 <b>Cymor Sell</b>\n\n${message}`);
}

module.exports = { initMainBotWebhook, handleMainBotUpdate, sendBroadcastMessage };
