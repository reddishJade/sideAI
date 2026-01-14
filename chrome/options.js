const ext = typeof browser !== "undefined" ? browser : chrome;
const isBrowser = typeof browser !== "undefined";

const apiKeyEl = document.getElementById("api-key");
const apiUrlEl = document.getElementById("api-url");
const modelEl = document.getElementById("model");
const themeEl = document.getElementById("theme");
const temperatureEl = document.getElementById("temperature");
const maxTokensEl = document.getElementById("max-tokens");
const topPEl = document.getElementById("top-p");
const presencePenaltyEl = document.getElementById("presence-penalty");
const frequencyPenaltyEl = document.getElementById("frequency-penalty");
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

async function loadSettings() {
  const data = await getStorage({
    apiKey: "",
    apiUrl: "https://api.openai.com/v1/chat/completions",
    model: "gpt-4o-mini",
    theme: "auto",
    temperature: "",
    maxTokens: "",
    topP: "",
    presencePenalty: "",
    frequencyPenalty: "",
  });
  apiKeyEl.value = data.apiKey || "";
  apiUrlEl.value = data.apiUrl || "";
  modelEl.value = data.model || "";
  themeEl.value = data.theme || "auto";
  temperatureEl.value = data.temperature ?? "";
  maxTokensEl.value = data.maxTokens ?? "";
  topPEl.value = data.topP ?? "";
  presencePenaltyEl.value = data.presencePenalty ?? "";
  frequencyPenaltyEl.value = data.frequencyPenalty ?? "";
  applyTheme(themeEl.value);
}

async function saveSettings() {
  const apiKey = apiKeyEl.value.trim();
  const apiUrl = apiUrlEl.value.trim();
  const model = modelEl.value.trim();
  const theme = themeEl.value || "auto";
  const temperature = temperatureEl.value.trim();
  const maxTokens = maxTokensEl.value.trim();
  const topP = topPEl.value.trim();
  const presencePenalty = presencePenaltyEl.value.trim();
  const frequencyPenalty = frequencyPenaltyEl.value.trim();

  await setStorage({
    apiKey,
    apiUrl,
    model,
    theme,
    temperature,
    maxTokens,
    topP,
    presencePenalty,
    frequencyPenalty,
  });
  setStatus("Saved");
  setTimeout(() => setStatus(""), 1500);
  applyTheme(theme);
}

saveButton.addEventListener("click", saveSettings);

loadSettings();
