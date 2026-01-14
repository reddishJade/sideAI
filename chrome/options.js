const ext = typeof browser !== "undefined" ? browser : chrome;
const isBrowser = typeof browser !== "undefined";

const apiKeyEl = document.getElementById("api-key");
const apiUrlEl = document.getElementById("api-url");
const modelEl = document.getElementById("model");
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

async function loadSettings() {
  const data = await getStorage({
    apiKey: "",
    apiUrl: "https://api.openai.com/v1/chat/completions",
    model: "gpt-4o-mini",
  });
  apiKeyEl.value = data.apiKey || "";
  apiUrlEl.value = data.apiUrl || "";
  modelEl.value = data.model || "";
}

async function saveSettings() {
  const apiKey = apiKeyEl.value.trim();
  const apiUrl = apiUrlEl.value.trim();
  const model = modelEl.value.trim();

  await setStorage({ apiKey, apiUrl, model });
  setStatus("Saved");
  setTimeout(() => setStatus(""), 1500);
}

saveButton.addEventListener("click", saveSettings);

loadSettings();
