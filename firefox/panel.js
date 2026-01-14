const ext = typeof browser !== "undefined" ? browser : chrome;
const isBrowser = typeof browser !== "undefined";

const chatEl = document.getElementById("chat");
const promptEl = document.getElementById("prompt");
const sendButton = document.getElementById("send-button");
const clearButton = document.getElementById("clear-button");
const settingsButton = document.getElementById("settings-button");
const modelSelect = document.getElementById("model-select");
const exportButton = document.getElementById("export-button");
const statusEl = document.getElementById("status");

let history = [];
let settings = null;
let isSending = false;
const MAX_HISTORY = 100;

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

function getLocalStorage(keys) {
  if (isBrowser) {
    return browser.storage.local.get(keys);
  }
  return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
}

function setLocalStorage(values) {
  if (isBrowser) {
    return browser.storage.local.set(values);
  }
  return new Promise((resolve) => chrome.storage.local.set(values, resolve));
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

function parseModels(models, fallback) {
  const list = (models || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (list.length > 0) {
    return list;
  }
  return fallback ? [fallback] : [];
}

function applyModelOptions(models, activeModel) {
  modelSelect.innerHTML = "";
  if (models.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Set API & models";
    option.disabled = true;
    option.selected = true;
    modelSelect.appendChild(option);
    modelSelect.classList.add("empty");
    return;
  }
  modelSelect.classList.remove("empty");
  models.forEach((model) => {
    const option = document.createElement("option");
    option.value = model;
    option.textContent = model;
    modelSelect.appendChild(option);
  });
  modelSelect.value = activeModel || models[0] || "";
}

function addMessage(role, content, isError = false) {
  const messageEl = document.createElement("div");
  messageEl.className = `message ${role}${isError ? " error" : ""}`;
  messageEl.textContent = content;
  chatEl.appendChild(messageEl);
  chatEl.scrollTop = chatEl.scrollHeight;
  return messageEl;
}

function clearChat() {
  history = [];
  chatEl.innerHTML = "";
  setStatus("Conversation cleared");
  setLocalStorage({ history: [] });
}

async function loadHistory() {
  const data = await getLocalStorage({ history: [] });
  history = Array.isArray(data.history) ? data.history : [];
  chatEl.innerHTML = "";
  history.forEach((message) => {
    if (message?.role && message?.content) {
      addMessage(message.role, message.content);
    }
  });
}

function persistHistory() {
  if (history.length > MAX_HISTORY) {
    history = history.slice(history.length - MAX_HISTORY);
  }
  setLocalStorage({ history });
}

function formatTimestamp(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function exportMarkdown() {
  if (history.length === 0) {
    setStatus("No messages to export", true);
    return;
  }
  const timestamp = formatTimestamp(new Date());
  const lines = [`# SideAI Chat - ${timestamp}`];
  history.forEach((message) => {
    const role =
      message.role === "user"
        ? "User"
        : message.role === "assistant"
          ? "Assistant"
          : message.role || "Message";
    lines.push(`## ${role}`);
    lines.push(message.content || "");
  });
  const blob = new Blob([lines.join("\n\n")], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `sideai-chat-${timestamp.replace(/[:\\s]/g, "-")}.md`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function loadSettings() {
  const data = await getStorage({
    apiKey: "",
    apiUrl: "https://api.openai.com/v1/chat/completions",
    model: "gpt-4o-mini",
    models: "",
    activeModel: "",
    theme: "auto",
    temperature: "",
    maxTokens: "",
    topP: "",
    presencePenalty: "",
    frequencyPenalty: "",
    stream: true,
  });
  settings = {
    apiKey: (data.apiKey || "").trim(),
    apiUrl: (data.apiUrl || "").trim(),
    model: (data.model || "").trim(),
    models: data.models || "",
    activeModel: data.activeModel || "",
    theme: data.theme || "auto",
    temperature: parseNumber(data.temperature),
    maxTokens: parseNumber(data.maxTokens),
    topP: parseNumber(data.topP),
    presencePenalty: parseNumber(data.presencePenalty),
    frequencyPenalty: parseNumber(data.frequencyPenalty),
    stream: data.stream !== false,
  };
  applyTheme(settings.theme);
  const modelList = parseModels(settings.models, settings.model);
  const resolvedActive =
    modelList.find((model) => model === settings.activeModel) || modelList[0] || settings.model;
  settings.activeModel = resolvedActive;
  applyModelOptions(modelList, resolvedActive);

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

async function streamChatCompletion(requestBody) {
  const response = await fetch(settings.apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({ ...requestBody, stream: true }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `HTTP ${response.status}`);
  }

  if (!response.body) {
    throw new Error("Streaming not supported by this response");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let assistantText = "";
  const assistantEl = addMessage("assistant", "");
  let done = false;

  while (!done) {
    const { value, done: streamDone } = await reader.read();
    if (streamDone) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() || "";

    for (const part of parts) {
      const lines = part.split("\n");
      for (const line of lines) {
        if (!line.startsWith("data:")) {
          continue;
        }
        const data = line.replace("data:", "").trim();
        if (!data) {
          continue;
        }
        if (data === "[DONE]") {
          done = true;
          break;
        }
        try {
          const parsed = JSON.parse(data);
          const delta = parsed?.choices?.[0]?.delta?.content;
          if (delta) {
            assistantText += delta;
            assistantEl.textContent = assistantText;
            chatEl.scrollTop = chatEl.scrollHeight;
          }
        } catch (error) {
          // Ignore malformed chunks.
        }
      }
      if (done) {
        break;
      }
    }
  }

  return assistantText.trim();
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
  persistHistory();

  setStatus("Thinking...");

  try {
    const requestBody = {
      model: settings.activeModel || settings.model,
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

    let assistantMessage = "";
    if (settings.stream) {
      setStatus("Streaming...");
      assistantMessage = await streamChatCompletion(requestBody);
    } else {
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
      assistantMessage = data?.choices?.[0]?.message?.content?.trim() || "";
      if (assistantMessage) {
        addMessage("assistant", assistantMessage);
      }
    }

    if (!assistantMessage) {
      throw new Error("Empty response from API");
    }

    history.push({ role: "assistant", content: assistantMessage });
    persistHistory();
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
modelSelect.addEventListener("change", () => {
  const selected = modelSelect.value;
  if (!selected) {
    return;
  }
  settings.activeModel = selected;
  setStorage({ activeModel: selected });
});
modelSelect.addEventListener("mousedown", (event) => {
  if (!settings || modelSelect.classList.contains("empty")) {
    event.preventDefault();
    openOptions();
  }
});
exportButton.addEventListener("click", exportMarkdown);

loadSettings();
loadHistory();

if (ext.storage?.onChanged) {
  ext.storage.onChanged.addListener((changes, area) => {
    if (area === "sync") {
      loadSettings();
    }
  });
}
