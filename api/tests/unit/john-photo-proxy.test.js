import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/services/session-store.js', () => ({ getSession: vi.fn() }));
vi.mock('../../src/services/john-relay.js', () => ({ streamTelegramFile: vi.fn() }));

import { johnMessagesHandler } from '../../src/handlers/john-messages.js';
import { johnPhotoHandler } from '../../src/handlers/john-photo.js';
import { getSession } from '../../src/services/session-store.js';
import { streamTelegramFile } from '../../src/services/john-relay.js';

function fakeReply() {
  return {
    _status: 200, _body: undefined, _headers: {},
    status(n) { this._status = n; return this; },
    header(k, v) { this._headers[k] = v; return this; },
    send(b) { this._body = b; return this; },
  };
}

beforeEach(() => vi.clearAllMocks());

describe('/john-messages never leaks a bot-token URL', () => {
  it('returns a proxy path for a photo message, not api.telegram.org', async () => {
    getSession.mockReturnValue({
      id: 'sess-1',
      john_messages: [
        { id: 1, ts: 5, type: 'text', content: 'hi' },
        { id: 2, ts: 6, type: 'image', content: '', file_id: 'FILE_BIG' },
      ],
    });
    const reply = fakeReply();
    await johnMessagesHandler({ params: { id: 'sess-1' }, query: {} }, reply);
    const img = reply._body.messages.find((m) => m.type === 'image');
    expect(img.url).toBe('/api/v1/session/sess-1/john-photo/FILE_BIG');
    expect(JSON.stringify(reply._body)).not.toContain('api.telegram.org');
  });
});

describe('/john-photo proxy authorises by session-owned file_id', () => {
  it('404s a file_id that is not in this session', async () => {
    getSession.mockReturnValue({ id: 'sess-1', john_messages: [{ type: 'image', file_id: 'MINE' }] });
    const reply = fakeReply();
    await johnPhotoHandler({ params: { id: 'sess-1', fileId: 'NOT_MINE' } }, reply);
    expect(reply._status).toBe(404);
    expect(streamTelegramFile).not.toHaveBeenCalled();
  });

  it('streams a known file_id with its content-type', async () => {
    getSession.mockReturnValue({ id: 'sess-1', john_messages: [{ type: 'image', file_id: 'MINE' }] });
    streamTelegramFile.mockResolvedValue({
      headers: { get: (k) => (k === 'content-type' ? 'image/jpeg' : null) },
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
    });
    const reply = fakeReply();
    await johnPhotoHandler({ params: { id: 'sess-1', fileId: 'MINE' } }, reply);
    expect(streamTelegramFile).toHaveBeenCalledWith('MINE');
    expect(reply._headers['content-type']).toBe('image/jpeg');
    expect(Buffer.isBuffer(reply._body)).toBe(true);
  });

  it('404s when the session does not exist', async () => {
    getSession.mockReturnValue(null);
    const reply = fakeReply();
    await johnPhotoHandler({ params: { id: 'nope', fileId: 'x' } }, reply);
    expect(reply._status).toBe(404);
  });
});
