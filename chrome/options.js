const ext = typeof browser !== "undefined" ? browser : chrome;
const isBrowser = typeof browser !== "undefined";

const apiKeyEl = document.getElementById("api-key");
const apiUrlEl = document.getElementById("api-url");
const modelEl = document.getElementById("model");
const modelsEl = document.getElementById("models");
const temperatureEl = document.getElementById("temperature");
const maxTokensEl = document.getElementById("max-tokens");
const topPEl = document.getElementById("top-p");
const presencePenaltyEl = document.getElementById("presence-penalty");
const frequencyPenaltyEl = document.getElementById("frequency-penalty");
const streamEl = document.getElementById("stream");
const renderUserMarkdownEl = document.getElementById("render-user-markdown");
const verifyButton = document.getElementById("verify-api");
const verifyStatus = document.getElementById("verify-status");
const saveButton = document.getElementById("save");
const statusEl = document.getElementById("status");

function getStorage(keys) {
  if (isBrowser) {
    return browser.storage.local.get(keys);
  }
  return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
}

function setStorage(values) {
  if (isBrowser) {
    return browser.storage.local.set(values);
  }
  return new Promise((resolve) => chrome.storage.local.set(values, resolve));
}

function setStatus(text) {
  statusEl.textContent = text;
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme || "auto";
}

function normalizeApiUrl(inputUrl) {
  const raw = (inputUrl || "").trim();
  if (!raw) {
    return "";
  }
  if (raw.includes("/chat/completions")) {
    return raw;
  }
  if (raw.endsWith("/v1")) {
    return `${raw}/chat/completions`;
  }
  if (raw.endsWith("/")) {
    return `${raw}v1/chat/completions`;
  }
  return `${raw}/v1/chat/completions`;
}

async function verifyApi(apiKey, apiUrl, model) {
  const resolvedUrl = normalizeApiUrl(apiUrl);
  const response = await fetch(resolvedUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: "ping" }],
      max_tokens: 1,
      temperature: 0,
    }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `HTTP ${response.status}`);
  }
  return true;
}

async function loadSettings() {
  const data = await getStorage({
    apiKey: "",
    apiUrl: "",
    model: "",
    models: "",
    theme: "auto",
    temperature: "",
    maxTokens: "",
    topP: "",
    presencePenalty: "",
    frequencyPenalty: "",
    stream: true,
    renderUserMarkdown: false,
  });
  apiKeyEl.value = data.apiKey || "";
  apiUrlEl.value = data.apiUrl || "";
  modelEl.value = data.model || "";
  modelsEl.value = data.models || "";
  applyTheme(data.theme || "auto");
  temperatureEl.value = data.temperature ?? "";
  maxTokensEl.value = data.maxTokens ?? "";
  topPEl.value = data.topP ?? "";
  presencePenaltyEl.value = data.presencePenalty ?? "";
  frequencyPenaltyEl.value = data.frequencyPenalty ?? "";
  streamEl.checked = data.stream !== false;
  renderUserMarkdownEl.checked = data.renderUserMarkdown === true;
}

async function saveSettings() {
  const apiKey = apiKeyEl.value.trim();
  const apiUrl = normalizeApiUrl(apiUrlEl.value.trim());
  const model = modelEl.value.trim();
  const models = modelsEl.value.trim();
  const theme = document.documentElement.dataset.theme || "auto";
  const temperature = temperatureEl.value.trim();
  const maxTokens = maxTokensEl.value.trim();
  const topP = topPEl.value.trim();
  const presencePenalty = presencePenaltyEl.value.trim();
  const frequencyPenalty = frequencyPenaltyEl.value.trim();
  const stream = streamEl.checked;
  const renderUserMarkdown = renderUserMarkdownEl.checked;

  await setStorage({
    apiKey,
    apiUrl,
    model,
    models,
    theme,
    temperature,
    maxTokens,
    topP,
    presencePenalty,
    frequencyPenalty,
    stream,
    renderUserMarkdown,
  });
  apiUrlEl.value = apiUrl;
  setStatus("Saved");
  setTimeout(() => setStatus(""), 1500);
  applyTheme(theme);
}

saveButton.addEventListener("click", saveSettings);
verifyButton.addEventListener("click", async () => {
  const apiKey = apiKeyEl.value.trim();
  const apiUrl = apiUrlEl.value.trim();
  const model = modelEl.value.trim();
  if (!apiKey || !apiUrl || !model) {
    verifyStatus.textContent = "Fill API key, endpoint, and model first.";
    return;
  }
  verifyStatus.textContent = "Verifying...";
  try {
    await verifyApi(apiKey, apiUrl, model);
    verifyStatus.textContent = "API verified.";
  } catch (error) {
    verifyStatus.textContent = "Verification failed.";
  }
});

loadSettings();
