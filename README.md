# Memos Quick Capture

A small, dependency-free browser extension for Microsoft Edge and Google Chrome that sends notes, text selections, links, and images to your self-hosted [Memos](https://github.com/usememos/memos) server.

It is written from scratch in plain JavaScript (Manifest V3), with no build step, no third-party libraries, no analytics, and no remote code, so you can read the whole thing in a few minutes.

## Features

- **Popup composer**: click the toolbar icon or press <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>M</kbd>.
  - Markdown text box, pre-filled with any text you've highlighted on the page (as a quote)
  - Optionally attach a link to the current page
  - Tags and visibility (Private / Workspace / Public) per memo
  - <kbd>Ctrl</kbd>+<kbd>Enter</kbd> to send
  - Unsent drafts are kept if the popup closes
- **Right-click menu**: send a selection, link, image, or the whole page in one click, using your default tags and visibility. A ✓ or ! badge on the toolbar icon shows whether it worked.
- **Settings page**: server URL, access token, default visibility, default tags, whether to attach the page link by default, and a *Test connection* button.

## Installation (unpacked)

The extension isn't published to any store; load it directly from this folder.

### Microsoft Edge

1. Clone or download this repository.
2. Open `edge://extensions`.
3. Turn on **Developer mode** (left sidebar or bottom-left).
4. Click **Load unpacked** and select the repository folder (the one containing `manifest.json`).
5. Optional: pin it using the puzzle-piece menu → eye icon.

### Google Chrome

Same steps at `chrome://extensions`: enable **Developer mode** (top-right) → **Load unpacked**.

> **Note:** The browser runs the extension directly from the folder, so don't move or delete it. Developer mode must stay on, and Edge may occasionally show a "developer mode extensions" warning, which is safe to dismiss.

## Setup

1. In Memos, go to **Settings → My Account → Access Tokens** and create a token.
2. The extension's settings page opens automatically on first install. You can also right-click the toolbar icon → **Extension options**.
3. Enter your server URL (e.g. `https://memos.example.com`) and the token.
4. Click **Test connection**. The browser will ask you to allow access to your Memos server; accept it.

To change the keyboard shortcut, go to `edge://extensions/shortcuts` (or `chrome://extensions/shortcuts`).

## Memo format

| Action | Content sent |
| --- | --- |
| Popup | Your text, then `[Page title](url)` if *Attach link* is checked, then `#tags` |
| Right-click → selection | `> quoted selection` + page link + default tags |
| Right-click → link | `[link text](link url)` + `via [page](url)` + default tags |
| Right-click → image | `![](image url)` + `via [page](url)` + default tags |
| Right-click → page | `[Page title](url)` + default tags |

## Permissions and privacy

| Permission | Why |
| --- | --- |
| `storage` | Save your settings and unsent draft in **local** extension storage. It is not synced to your browser account. |
| `contextMenus` | The right-click "Send … to Memos" items. |
| `activeTab` | Read the current tab's title and URL, only when you click the extension. |
| `scripting` | Read your highlighted text on the current tab when you open the popup. |
| Host access (optional) | Requested at runtime for **only your Memos server's origin**, so the extension can call its API. |

The access token is sent only to the server URL you configure. The extension makes no other network requests.

## Compatibility

Targets the Memos v1 API (`POST /api/v1/memos`), used by Memos **0.22 and newer**. *Test connection* tries the auth endpoints used by several Memos versions (`/api/v1/auth/sessions/current`, `/api/v1/auth/me`, `/api/v1/auth/status`).

"Workspace" visibility corresponds to Memos' `PROTECTED` (visible to logged-in users).

## Project layout

```
manifest.json    Extension manifest (MV3)
api.js           Memos API client and formatting helpers (all network calls live here)
background.js    Service worker: context menus and badge feedback
popup.html/.js   Toolbar popup composer
options.html/.js Settings page
styles.css       Shared styles (light and dark)
icons/           Toolbar and extension icons
```

## Development

There's nothing to build. Edit the files, then click the reload ↻ icon on the extension's card in `edge://extensions`. To debug:

- **Popup**: right-click inside the popup → *Inspect*.
- **Service worker / context menus**: click the *service worker* link on the extension's card.

## Troubleshooting

- **"Not configured"**: open the settings page and save a server URL and token.
- **"Access token was rejected"**: the token is wrong, expired, or was deleted in Memos. Create a new one.
- **"Could not find a Memos auth endpoint"**: check the server URL (no `/api` suffix needed), or your Memos version may be older than 0.22.
- **Red `!` badge after a right-click send**: hover the toolbar icon to see the error message.
- **Selection isn't pre-filled**: browsers block scripts on internal pages (`edge://`, the extension stores, the PDF viewer).

## Acknowledgements

Inspired by [chendimao/memos-browers-plugin](https://github.com/chendimao/memos-browers-plugin). This project is an independent rewrite and shares no code with it.
# memos-quick-capture
