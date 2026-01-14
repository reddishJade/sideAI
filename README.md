# SideAI

Minimal sidebar AI chat extension for Chrome and Firefox using OpenAI-compatible APIs.

## Load in Chrome
1. Open `chrome://extensions` and enable Developer mode.
2. Click "Load unpacked" and select `extension/`.
3. Rename `extension/manifest.chrome.json` to `extension/manifest.json` before loading.

## Load in Firefox
1. Open `about:debugging#/runtime/this-firefox`.
2. Click "Load Temporary Add-on".
3. Rename `extension/manifest.firefox.json` to `extension/manifest.json` and select that file.

## Configure
Open the extension settings page and set:
- API Key
- API Endpoint (OpenAI-compatible `/v1/chat/completions`)
- Model name
