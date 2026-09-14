// The mailbox door: check@ethikslabs.com. A founder forwards an email; the poller reads it
// through Microsoft Graph (application permissions on one mailbox), runs the check on the
// raw MIME, replies in the same thread with the three lines and the evidence, marks the
// message read and files it under "Checked". Only Graph and the token endpoint are ever
// called from here; the check itself stays read-only.
import { runInboundCheck, renderCheck } from './index.js';
import { fileRegistry } from './registry.js';

const GRAPH = 'https://graph.microsoft.com/v1.0';

export function graphClient({ tenantId, clientId, clientSecret, mailbox, fetchImpl = fetch }) {
  let token = null, expiresAt = 0;
  async function bearer() {
    if (token && Date.now() < expiresAt - 60_000) return token;
    const res = await fetchImpl(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, scope: 'https://graph.microsoft.com/.default', grant_type: 'client_credentials' }).toString(),
    });
    if (!res.ok) throw new Error(`graph token ${res.status}`);
    const j = await res.json();
    token = j.access_token; expiresAt = Date.now() + (j.expires_in || 3600) * 1000;
    return token;
  }
  async function call(path, { method = 'GET', body, raw = false } = {}) {
    const res = await fetchImpl(`${GRAPH}/users/${encodeURIComponent(mailbox)}${path}`, {
      method,
      headers: { Authorization: `Bearer ${await bearer()}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`graph ${method} ${path} ${res.status}`);
    if (raw) return res.text();
    const t = await res.text();
    return t ? JSON.parse(t) : {};
  }
  const folderIds = new Map();
  async function folderId(name) {
    if (!folderIds.has(name)) {
      const j = await call(`/mailFolders?$filter=displayName eq '${name}'&$select=id,displayName`);
      folderIds.set(name, j.value?.[0]?.id || (await call('/mailFolders', { method: 'POST', body: { displayName: name } })).id);
    }
    return folderIds.get(name);
  }
  return {
    mailbox,
    listUnread: () => call(`/mailFolders/inbox/messages?$filter=isRead eq false&$select=id,subject,from,toRecipients,ccRecipients,conversationId&$top=25`).then((j) => j.value || []),
    mime: (id) => call(`/messages/${id}/$value`, { raw: true }),
    reply: (id, comment) => call(`/messages/${id}/reply`, { method: 'POST', body: { comment } }),
    markRead: (id) => call(`/messages/${id}`, { method: 'PATCH', body: { isRead: true } }),
    fileAs: async (id, name) => call(`/messages/${id}/move`, { method: 'POST', body: { destinationId: await folderId(name) } }),
  };
}

// `address` may be one address or a comma-separated list (the mailbox answers to
// check@ethikslabs.com and check@ethiks360.com).
function addressedTo(msg, address) {
  const wanted = String(address).split(',').map((a) => a.trim().toLowerCase()).filter(Boolean);
  const all = [...(msg.toRecipients || []), ...(msg.ccRecipients || [])].map((r) => r.emailAddress?.address?.toLowerCase());
  return wanted.some((w) => all.includes(w));
}

// The reply is plain text inside <pre> so the three lines and the table keep their shape in
// every mail client. Nothing else is added: no signature, no link, no ask.
function replyBody(result) {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<pre style="font-family:ui-monospace,Menlo,monospace;white-space:pre-wrap">${esc(renderCheck(result))}\n\nchecked ${result.checked_at.slice(0, 16).replace('T', ' ')} UTC · proof360</pre>`;
}

// The door is for founders with a proof360 record (John, 14 Sept: "it needs to map to a
// registered email … otherwise it is a free for all"). Anyone else is pointed to proof360
// to do a read and register, warmly, with no check run and nothing looked up or stored.
function declineBody(baseUrl) {
  return `<p>Thanks for sending this over.</p>
<p>The check runs for founders with a proof360 record, so the reply is yours and only yours. Start one at <a href="${baseUrl}">${baseUrl}</a>: a read of your own company takes a couple of minutes. Then forward this email again and the three lines come straight back.</p>
<p>proof360</p>`;
}

export async function pollOnce({ graph, address, deps, registry, baseUrl = process.env.REPORT_BASE_URL || 'https://proof360.au', log = () => {} }) {
  const out = { handled: [], skipped: [], declined: [], errors: [] };
  const unread = await graph.listUnread();
  for (const msg of unread) {
    if (!addressedTo(msg, address)) { out.skipped.push(msg.id); continue; }
    try {
      const forwarder = msg.from?.emailAddress?.address || '';
      // Default-deny: no registry, or no record, is a decline. The check never runs for it.
      const registered = registry ? await registry.isRegistered(forwarder) === true : false;
      if (!registered) {
        await graph.reply(msg.id, declineBody(baseUrl));
        await graph.markRead(msg.id);
        await graph.fileAs(msg.id, 'Unregistered').catch((err) => log(`file: ${err.message}`));
        out.declined.push(msg.id);
        log(`declined ${forwarder}: no proof360 record`);
        continue;
      }
      const mime = await graph.mime(msg.id);
      const result = await runInboundCheck(mime, deps);
      await graph.reply(msg.id, replyBody(result));
      await graph.markRead(msg.id);
      await graph.fileAs(msg.id, 'Checked').catch((err) => log(`file: ${err.message}`));
      out.handled.push(msg.id);
      log(`checked ${result.sender.address} for ${msg.from?.emailAddress?.address} (${result.memory.prior_matches} prior)`);
    } catch (err) {
      out.errors.push({ id: msg.id, error: err.message });
      log(`error on ${msg.id}: ${err.message}`);
    }
  }
  return out;
}

// Started by the server when the mailbox env is present. Polls every `everyMs`; a poll that
// throws is logged and the next one runs. Nothing else in the process depends on it.
export function startMailboxPoller({ env = process.env, deps, everyMs = 45_000, log = console.log } = {}) {
  const { M365_TENANT_ID, M365_CLIENT_ID, M365_CLIENT_SECRET, M365_MAILBOX, INBOUND_CHECK_ADDRESS } = env;
  if (!(M365_TENANT_ID && M365_CLIENT_ID && M365_CLIENT_SECRET && M365_MAILBOX && INBOUND_CHECK_ADDRESS)) return null;
  const graph = graphClient({ tenantId: M365_TENANT_ID, clientId: M365_CLIENT_ID, clientSecret: M365_CLIENT_SECRET, mailbox: M365_MAILBOX });
  let busy = false;
  const tick = async () => {
    if (busy) return; busy = true;
    try { await pollOnce({ graph, address: INBOUND_CHECK_ADDRESS, deps, registry: fileRegistry, log: (m) => log(`[inbound-check] ${m}`) }); }
    catch (err) { log(`[inbound-check] poll failed: ${err.message}`); }
    finally { busy = false; }
  };
  const timer = setInterval(tick, everyMs);
  timer.unref?.();
  log(`[inbound-check] mailbox poller on ${M365_MAILBOX} for ${INBOUND_CHECK_ADDRESS}, every ${everyMs / 1000}s`);
  setTimeout(tick, 5_000).unref?.();
  return timer;
}
