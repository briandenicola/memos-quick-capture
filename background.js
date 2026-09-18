import { getSettings, createMemo, formatTags, quote, link } from './api.js';

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: 'selection', title: 'Send selection to Memos', contexts: ['selection'] });
    chrome.contextMenus.create({ id: 'link', title: 'Send link to Memos', contexts: ['link'] });
    chrome.contextMenus.create({ id: 'image', title: 'Send image to Memos', contexts: ['image'] });
    chrome.contextMenus.create({ id: 'page', title: 'Send page to Memos', contexts: ['page'] });
  });
  if (reason === 'install') chrome.runtime.openOptionsPage();
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const settings = await getSettings();
  if (!settings.serverUrl || !settings.token) {
    chrome.runtime.openOptionsPage();
    return;
  }

  const source = link(tab?.title, info.pageUrl);
  let body;
  switch (info.menuItemId) {
    case 'selection': body = `${quote(info.selectionText)}\n\n${source}`; break;
    case 'link':      body = `${link(info.linkText || info.linkUrl, info.linkUrl)}\n\nvia ${source}`; break;
    case 'image':     body = `![](${info.srcUrl})\n\nvia ${source}`; break;
    default:          body = source;
  }
  const tags = formatTags(settings.defaultTags);
  const content = tags ? `${body}\n\n${tags}` : body;

  try {
    await createMemo({ content, visibility: settings.defaultVisibility });
    flashBadge('✓', '#2e7d32');
  } catch (err) {
    console.error('Memos:', err);
    flashBadge('!', '#c62828', err.message);
  }
});

function flashBadge(text, color, title) {
  chrome.action.setBadgeBackgroundColor({ color });
  chrome.action.setBadgeText({ text });
  if (title) chrome.action.setTitle({ title: `Memos error: ${title}` });
  setTimeout(() => {
    chrome.action.setBadgeText({ text: '' });
    chrome.action.setTitle({ title: 'Send to Memos' });
  }, 4000);
}
