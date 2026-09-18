// Shared helpers for talking to a Memos server (https://github.com/usememos/memos).

export const DEFAULTS = {
  serverUrl: '',
  token: '',
  defaultVisibility: 'PRIVATE',
  defaultTags: '',
  includeLink: true,
};

export async function getSettings() {
  // storage.local (not sync) so the access token never leaves this machine.
  return chrome.storage.local.get(DEFAULTS);
}

export function baseUrl(serverUrl) {
  return serverUrl.trim().replace(/\/+$/, '');
}

export function originPattern(serverUrl) {
  return `${new URL(serverUrl).origin}/*`;
}

async function request(path, { method = 'GET', body } = {}) {
  const { serverUrl, token } = await getSettings();
  if (!serverUrl || !token) throw new Error('Not configured. Open the extension options first.');
  const res = await fetch(`${baseUrl(serverUrl)}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res;
}

async function errorFrom(res) {
  let msg = `${res.status} ${res.statusText}`;
  try {
    const j = await res.json();
    if (j.message) msg += ` - ${j.message}`;
  } catch {}
  return new Error(msg);
}

/** Create a memo. Returns { memo, url } where url links to the memo in the web UI. */
export async function createMemo({ content, visibility }) {
  const res = await request('/api/v1/memos', { method: 'POST', body: { content, visibility } });
  if (!res.ok) throw await errorFrom(res);
  const memo = await res.json();
  const { serverUrl } = await getSettings();
  // v0.22+: name = "memos/<uid>"; older builds return a numeric id.
  const id = memo.name?.split('/').pop() || memo.uid || memo.id;
  return { memo, url: id ? `${baseUrl(serverUrl)}/m/${id}` : baseUrl(serverUrl) };
}

/** Verify the server + token. Tries the auth endpoints used by different Memos versions. */
export async function testConnection() {
  const attempts = [
    ['GET', '/api/v1/auth/sessions/current'], // newest
    ['GET', '/api/v1/auth/me'],
    ['POST', '/api/v1/auth/status'],          // ~0.22 - 0.24
  ];
  for (const [method, path] of attempts) {
    const res = await request(path, { method });
    if (res.status === 401 || res.status === 403) throw new Error('Server reached, but the access token was rejected.');
    if (res.ok) {
      const j = await res.json().catch(() => ({}));
      const user = j.user ?? j;
      return user.nickname || user.username || 'OK';
    }
  }
  throw new Error('Could not find a Memos auth endpoint. Is the URL correct?');
}

export function formatTags(tags) {
  return tags
    .split(/[\s,]+/)
    .map((t) => t.replace(/^#/, '').trim())
    .filter(Boolean)
    .map((t) => `#${t}`)
    .join(' ');
}

export function quote(text) {
  return text.trim().split('\n').map((l) => `> ${l}`).join('\n');
}

export function link(title, url) {
  const safe = (title || url).replace(/[\[\]]/g, '');
  return `[${safe}](${url})`;
}
