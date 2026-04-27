// SIGNUM stub — direct Telegram while SIGNUM is pre-build.
// Replaceable by full SIGNUM without changing call site.
export async function send({ channel, to, message }) {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.warn(JSON.stringify({ event: 'signum_noop', reason: 'TELEGRAM_BOT_TOKEN not set' }));
    return;
  }
  if (!to) {
    console.warn(JSON.stringify({ event: 'signum_noop', reason: 'no recipient' }));
    return;
  }
  try {
    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: to, text: message }),
    });
  } catch (err) {
    console.error(JSON.stringify({ event: 'signum_send_failed', error: err.message }));
  }
}
