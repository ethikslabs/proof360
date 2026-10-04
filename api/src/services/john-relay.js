const BOT_TOKEN  = process.env.TELEGRAM_BOT_TOKEN;
const JOHN_CHAT  = process.env.TELEGRAM_CHAT_ID;

// Maps Telegram message_id → session_id so webhook can route replies back
const msgToSession = new Map();

// Returns true only when the message was actually delivered to Telegram, so the caller
// can tell the sender the truth instead of a blanket "sent".
export async function notifyJohn({ sessionId, companyName, score, message }) {
  if (!BOT_TOKEN || !JOHN_CHAT) return false;

  const text = [
    `🔔 *@john — proof360*`,
    ``,
    `*${companyName || 'Unknown'}* · Score ${score ?? '—'}`,
    `Session: \`${sessionId}\``,
    ``,
    `_"${message}"_`,
  ].join('\n');

  try {
    const res  = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: JOHN_CHAT, text, parse_mode: 'Markdown' }),
    });
    const data = await res.json();
    if (data.ok && data.result?.message_id) {
      msgToSession.set(data.result.message_id, sessionId);
      setTimeout(() => msgToSession.delete(data.result.message_id), 24 * 60 * 60 * 1000);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function getSessionForMessage(messageId) {
  return msgToSession.get(messageId) ?? null;
}

// INTERNAL ONLY — the returned URL embeds the bot token. Never return it to a client;
// it is consumed server-side by streamTelegramFile below. (No longer exported for the
// webhook, which now stores the Telegram file_id and serves photos through the proxy.)
async function getTelegramFileUrl(fileId) {
  if (!BOT_TOKEN) return null;
  try {
    const res  = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${encodeURIComponent(fileId)}`);
    const data = await res.json();
    if (!data.ok) return null;
    return `https://api.telegram.org/file/bot${BOT_TOKEN}/${data.result.file_path}`;
  } catch {
    return null;
  }
}

/**
 * Fetch a Telegram file server-side and return the raw Response. The bot-token URL stays
 * inside this process; the proxy route (john-photo) streams the bytes to the browser so
 * nothing token-bearing is ever stored on a session or sent to a client.
 */
export async function streamTelegramFile(fileId) {
  const url = await getTelegramFileUrl(fileId);
  if (!url) return null;
  try {
    const res = await fetch(url);
    return res.ok ? res : null;
  } catch {
    return null;
  }
}
