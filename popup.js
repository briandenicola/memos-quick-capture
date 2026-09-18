import { getSettings, createMemo, formatTags, quote, link } from './api.js';

const $ = (id) => document.getElementById(id);
const DRAFT_KEY = 'draft';
let tab;

init();

async function init() {
  const settings = await getSettings();
  const openOptions = (e) => { e?.preventDefault(); chrome.runtime.openOptionsPage(); window.close(); };
  $('openOptions').onclick = openOptions;
  $('settingsLink').onclick = openOptions;

  if (!settings.serverUrl || !settings.token) {
    $('unconfigured').hidden = false;
    return;
  }
  $('form').hidden = false;
  $('visibility').value = settings.defaultVisibility;
  $('tags').value = settings.defaultTags;

  [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const linkable = /^https?:/.test(tab?.url || '');
  $('includeLink').checked = settings.includeLink && linkable;
  $('includeLink').disabled = !linkable;

  // Restore an unsent draft, otherwise pre-fill with the page selection.
  const { [DRAFT_KEY]: draft } = await chrome.storage.local.get(DRAFT_KEY);
  if (draft) {
    $('content').value = draft;
  } else if (linkable) {
    try {
      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => window.getSelection().toString(),
      });
      if (result?.trim()) $('content').value = quote(result) + '\n\n';
    } catch { /* some pages (edge://, the web store) can't be scripted */ }
  }
  const end = $('content').value.length;
  $('content').focus();
  $('content').setSelectionRange(end, end);

  $('content').addEventListener('input', () =>
    chrome.storage.local.set({ [DRAFT_KEY]: $('content').value }));
  $('content').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) $('form').requestSubmit();
  });
  $('form').addEventListener('submit', send);
}

async function send(e) {
  e.preventDefault();
  const parts = [$('content').value.trim()];
  if ($('includeLink').checked) parts.push(link(tab.title, tab.url));
  const tags = formatTags($('tags').value);
  if (tags) parts.push(tags);
  const content = parts.filter(Boolean).join('\n\n');
  if (!content) return setStatus('Nothing to send.', 'err');

  $('send').disabled = true;
  setStatus('Sending…');
  try {
    const { url } = await createMemo({ content, visibility: $('visibility').value });
    await chrome.storage.local.remove(DRAFT_KEY);
    $('content').value = '';
    setStatus('Saved. ', 'ok');
    $('status').append(Object.assign(document.createElement('a'), { href: url, target: '_blank', textContent: 'View memo' }));
    setTimeout(() => window.close(), 1500);
  } catch (err) {
    setStatus(err.message, 'err');
  } finally {
    $('send').disabled = false;
  }
}

function setStatus(text, kind = '') {
  $('status').className = `status ${kind}`;
  $('status').textContent = text;
}
