// Thin wrapper around the Telegram Bot HTTP API using plain fetch, so we don't
// need to keep long-lived polling bot instances per business (webhook-only).
const TELEGRAM_API = 'https://api.telegram.org';

async function callTelegram(token, method, payload) {
  const res = await fetch(`${TELEGRAM_API}/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!data.ok) {
    const err = new Error(`Telegram API error (${method}): ${data.description}`);
    err.telegram = data;
    throw err;
  }
  return data.result;
}

function sendMessage(token, chatId, text, options = {}) {
  return callTelegram(token, 'sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    reply_markup: options.replyMarkup,
  });
}

function answerCallbackQuery(token, callbackQueryId, text) {
  return callTelegram(token, 'answerCallbackQuery', { callback_query_id: callbackQueryId, text });
}

function getMe(token) {
  return callTelegram(token, 'getMe', {});
}

function setWebhook(token, url) {
  return callTelegram(token, 'setWebhook', { url });
}

function inlineKeyboard(rows) {
  // rows: [[{text, callback_data}]]
  return { inline_keyboard: rows };
}

module.exports = { callTelegram, sendMessage, answerCallbackQuery, getMe, setWebhook, inlineKeyboard };
