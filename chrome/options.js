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
const verifyButton = document.getElementById("verify-api");
const verifyStatus = document.getElementById("verify-status");
const saveButton = document.getElementById("save");
const statusEl = document.getElementById("status");

function getStorage(keys) {
  if (isBrowser) {
    return browser.storage.sync.get(keys);
  }
  return new Promise((resolve) => chrome.storage.sync.get(keys, resolve));
}

function setStorage(values) {
  if (isBrowser) {
    return browser.storage.sync.set(values);
  }
  return new Promise((resolve) => chrome.storage.sync.set(values, resolve));
}

function setStatus(text) {
  statusEl.textContent = text;
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme || "auto";
}

async function verifyApi(apiKey, apiUrl, model) {
  const response = await fetch(apiUrl, {
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
}

async function saveSettings() {
  const apiKey = apiKeyEl.value.trim();
  const apiUrl = apiUrlEl.value.trim();
  const model = modelEl.value.trim();
  const models = modelsEl.value.trim();
  const theme = document.documentElement.dataset.theme || "auto";
  const temperature = temperatureEl.value.trim();
  const maxTokens = maxTokensEl.value.trim();
  const topP = topPEl.value.trim();
  const presencePenalty = presencePenaltyEl.value.trim();
  const frequencyPenalty = frequencyPenaltyEl.value.trim();
  const stream = streamEl.checked;

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
  });
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
