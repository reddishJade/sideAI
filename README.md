# SideAI

Minimal sidebar AI chat extension for Chrome and Firefox using OpenAI-compatible APIs.

## Load in Chrome
1. Open `chrome://extensions` and enable Developer mode.
2. Click "Load unpacked" and select `chrome/`.

## Load in Firefox
1. Open `about:debugging#/runtime/this-firefox`.
2. Click "Load Temporary Add-on".
3. Select `firefox/manifest.json`.

## Package for install
Run:
```bash
./scripts/package.sh
```
This creates `dist/chrome.zip` and `dist/firefox.zip`.

## Release via GitHub tags
Push a tag like `v0.1.0` and GitHub Actions will publish a Release with the two zip assets.

```bash
git tag v0.1.0
git push origin v0.1.0
```

Note: GitHub automatically attaches source archives to releases; this cannot be disabled.

### Install in Chrome (packed)
1. Open `chrome://extensions`.
2. Drag `dist/chrome.zip` into the page or use "Load unpacked" with the extracted zip folder.
3. For a signed `.crx`, use the Chrome Web Store developer dashboard.

### Install in Firefox (packed)
1. Open `about:addons`.
2. Click the gear icon and choose "Install Add-on From File...".
3. Select `dist/firefox.zip` (or rename to `.xpi`).

## Configure
Open the extension settings page and set:
- API Key
- API Endpoint (OpenAI-compatible `/v1/chat/completions`)
- Model name
