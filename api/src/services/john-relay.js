const BOT_TOKEN  = process.env.TELEGRAM_BOT_TOKEN;
const JOHN_CHAT  = process.env.TELEGRAM_CHAT_ID;

// Maps Telegram message_id → session_id so webhook can route replies back
const msgToSession = new Map();

export async function notifyJohn({ sessionId, companyName, score, message }) {
  if (!BOT_TOKEN || !JOHN_CHAT) return;

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
    }
  } catch {
    // fire-and-forget
  }
}

export function getSessionForMessage(messageId) {
  return msgToSession.get(messageId) ?? null;
}

export async function getTelegramFileUrl(fileId) {
  if (!BOT_TOKEN) return null;
  try {
    const res  = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`);
    const data = await res.json();
    if (!data.ok) return null;
    return `https://api.telegram.org/file/bot${BOT_TOKEN}/${data.result.file_path}`;
  } catch {
    return null;
  }
}
