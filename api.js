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

async function memoUrl(memo) {
  const { serverUrl } = await getSettings();
  // 0.22-0.23: name = "memos/<numeric id>" plus a separate uid; 0.24+: name = "memos/<uid>".
  const id = memo.uid || memo.name?.split('/').pop() || memo.id;
  return id ? `${baseUrl(serverUrl)}/m/${id}` : baseUrl(serverUrl);
}

/** Remember the most recent memo this extension created, so later captures can append to it. */
async function rememberLastMemo(memo, url) {
  const snippet = (memo.content || '').replace(/\s+/g, ' ').trim().slice(0, 80);
  await chrome.storage.local.set({ lastMemo: { name: memo.name, url, snippet } });
}

export async function getLastMemo() {
  const { lastMemo } = await chrome.storage.local.get('lastMemo');
  return lastMemo?.name ? lastMemo : null;
}

/** Create a memo. Returns { memo, url } where url links to the memo in the web UI. */
export async function createMemo({ content, visibility }) {
  const res = await request('/api/v1/memos', { method: 'POST', body: { content, visibility } });
  if (!res.ok) throw await errorFrom(res);
  const memo = await res.json();
  const url = await memoUrl(memo);
  await rememberLastMemo(memo, url);
  return { memo, url };
}

/** Append text to the last memo this extension created. Returns { memo, url }. */
export async function appendToLastMemo(text) {
  const last = await getLastMemo();
  if (!last) throw new Error('No previous memo to append to.');

  const getRes = await request(`/api/v1/${last.name}`);
  if (getRes.status === 404) {
    await chrome.storage.local.remove('lastMemo');
    throw new Error('The last memo no longer exists. Send as a new memo instead.');
  }
  if (!getRes.ok) throw await errorFrom(getRes);
  const current = await getRes.json();

  const content = `${(current.content || '').trimEnd()}\n\n${text}`;
  const res = await request(`/api/v1/${last.name}?updateMask=content`, {
    method: 'PATCH',
    body: { name: last.name, content },
  });
  if (!res.ok) throw await errorFrom(res);
  const memo = await res.json();
  const url = await memoUrl(memo);
  await rememberLastMemo(memo, url);
  return { memo, url };
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
