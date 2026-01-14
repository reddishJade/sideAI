const ext = typeof browser !== "undefined" ? browser : chrome;
const isBrowser = typeof browser !== "undefined";

const chatEl = document.getElementById("chat");
const promptEl = document.getElementById("prompt");
const sendButton = document.getElementById("send-button");
const clearButton = document.getElementById("clear-button");
const settingsButton = document.getElementById("settings-button");
const statusEl = document.getElementById("status");

let history = [];
let settings = null;
let isSending = false;

function getStorage(keys) {
  if (isBrowser) {
    return browser.storage.sync.get(keys);
  }
  return new Promise((resolve) => chrome.storage.sync.get(keys, resolve));
}

function setStatus(text, isError = false) {
  statusEl.textContent = text;
  statusEl.style.color = isError ? "var(--danger)" : "var(--muted)";
}

function parseNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme || "auto";
}

function addMessage(role, content, isError = false) {
  const messageEl = document.createElement("div");
  messageEl.className = `message ${role}${isError ? " error" : ""}`;
  messageEl.textContent = content;
  chatEl.appendChild(messageEl);
  chatEl.scrollTop = chatEl.scrollHeight;
}

function clearChat() {
  history = [];
  chatEl.innerHTML = "";
  setStatus("Conversation cleared");
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
  settings = {
    apiKey: (data.apiKey || "").trim(),
    apiUrl: (data.apiUrl || "").trim(),
    model: (data.model || "").trim(),
    theme: data.theme || "auto",
    temperature: parseNumber(data.temperature),
    maxTokens: parseNumber(data.maxTokens),
    topP: parseNumber(data.topP),
    presencePenalty: parseNumber(data.presencePenalty),
    frequencyPenalty: parseNumber(data.frequencyPenalty),
  };
  applyTheme(settings.theme);

  if (!settings.apiKey || !settings.apiUrl || !settings.model) {
    setStatus("Set API settings before chatting", true);
  } else {
    setStatus("Ready");
  }
}

function openOptions() {
  if (ext.runtime.openOptionsPage) {
    ext.runtime.openOptionsPage();
    return;
  }
  if (ext.runtime.getURL) {
    window.open(ext.runtime.getURL("options.html"));
  }
}

async function sendMessage() {
  const text = promptEl.value.trim();
  if (!text || isSending) {
    return;
  }

  if (!settings || !settings.apiKey || !settings.apiUrl || !settings.model) {
    setStatus("Missing API settings", true);
    openOptions();
    return;
  }

  isSending = true;
  sendButton.disabled = true;
  promptEl.value = "";
  addMessage("user", text);
  history.push({ role: "user", content: text });

  setStatus("Thinking...");

  try {
    const requestBody = {
      model: settings.model,
      messages: history,
    };
    if (settings.temperature !== null) {
      requestBody.temperature = settings.temperature;
    }
    if (settings.maxTokens !== null) {
      requestBody.max_tokens = Math.trunc(settings.maxTokens);
    }
    if (settings.topP !== null) {
      requestBody.top_p = settings.topP;
    }
    if (settings.presencePenalty !== null) {
      requestBody.presence_penalty = settings.presencePenalty;
    }
    if (settings.frequencyPenalty !== null) {
      requestBody.frequency_penalty = settings.frequencyPenalty;
    }

    const response = await fetch(settings.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const assistantMessage = data?.choices?.[0]?.message?.content?.trim();

    if (!assistantMessage) {
      throw new Error("Empty response from API");
    }

    history.push({ role: "assistant", content: assistantMessage });
    addMessage("assistant", assistantMessage);
    setStatus("Ready");
  } catch (error) {
    const message = error?.message || "Request failed";
    addMessage("assistant", message, true);
    setStatus("Request failed", true);
  } finally {
    isSending = false;
    sendButton.disabled = false;
    promptEl.focus();
  }
}

promptEl.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
});

sendButton.addEventListener("click", sendMessage);
clearButton.addEventListener("click", clearChat);
settingsButton.addEventListener("click", openOptions);

loadSettings();

if (ext.storage?.onChanged) {
  ext.storage.onChanged.addListener((changes, area) => {
    if (area === "sync") {
      loadSettings();
    }
  });
}
