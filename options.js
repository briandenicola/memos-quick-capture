import { DEFAULTS, getSettings, testConnection, originPattern } from './api.js';

const $ = (id) => document.getElementById(id);
const fields = Object.keys(DEFAULTS);

(async () => {
  const s = await getSettings();
  for (const f of fields) {
    if ($(f).type === 'checkbox') $(f).checked = s[f];
    else $(f).value = s[f];
  }
})();

function read() {
  const out = {};
  for (const f of fields) out[f] = $(f).type === 'checkbox' ? $(f).checked : $(f).value.trim();
  return out;
}

// permissions.request must be called synchronously inside the click handler (user gesture),
// so it runs before any await. Only the one origin of your Memos server is requested.
function requestHostAccess(serverUrl) {
  let pattern;
  try { pattern = originPattern(serverUrl); } catch { return Promise.reject(new Error('Invalid server URL.')); }
  return chrome.permissions.request({ origins: [pattern] }).then((granted) => {
    if (!granted) throw new Error(`Permission to access ${pattern} was denied.`);
  });
}

const save = () => chrome.storage.local.set(read());

$('form').addEventListener('submit', (e) => {
  e.preventDefault();
  requestHostAccess($('serverUrl').value)
    .then(save)
    .then(() => setStatus('Saved.', 'ok'))
    .catch((err) => setStatus(err.message, 'err'));
});

$('test').addEventListener('click', () => {
  setStatus('Testing…');
  requestHostAccess($('serverUrl').value)
    .then(save)
    .then(testConnection)
    .then((who) => setStatus(`Connected as ${who}. Settings saved.`, 'ok'))
    .catch((err) => setStatus(err.message, 'err'));
});

function setStatus(text, kind = '') {
  $('status').className = `status ${kind}`;
  $('status').textContent = text;
}
