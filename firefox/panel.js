const ext = typeof browser !== "undefined" ? browser : chrome;
const isBrowser = typeof browser !== "undefined";

const chatEl = document.getElementById("chat");
const promptEl = document.getElementById("prompt");
const sendButton = document.getElementById("send-button");
const clearButton = document.getElementById("clear-button");
const settingsButton = document.getElementById("settings-button");
const modelSelect = document.getElementById("model-select");
const exportButton = document.getElementById("export-button");
const historyButton = document.getElementById("history-button");
const historyPanel = document.getElementById("history-panel");
const historyList = document.getElementById("history-list");
const historyClose = document.getElementById("history-close");
const newChatButton = document.getElementById("new-chat");
const historySearch = document.getElementById("history-search");
const miniSettings = document.getElementById("mini-settings");
const miniClose = document.getElementById("mini-close");
const miniApiKey = document.getElementById("mini-api-key");
const miniApiUrl = document.getElementById("mini-api-url");
const miniModelSelect = document.getElementById("mini-model-select");
const miniModelInput = document.getElementById("mini-model-input");
const miniSave = document.getElementById("mini-save");
const miniMore = document.getElementById("mini-more");
const statusEl = document.getElementById("status");

let history = [];
let settings = null;
let isSending = false;
let availableModels = [];
const MAX_HISTORY = 100;
let conversations = [];
let activeConversationId = "";
let historyFilter = "";

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

function applyModelOptions(models, activeModel, hasApi) {
  modelSelect.innerHTML = "";
  if (!hasApi) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "\u65e0\u53ef\u7528\u6a21\u578b";
    option.disabled = true;
    option.selected = true;
    modelSelect.appendChild(option);
    modelSelect.classList.add("empty");
    return;
  }
  if (models.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "\u8bf7\u5148\u8bbe\u7f6e\u6a21\u578b";
    option.disabled = true;
    option.selected = true;
    modelSelect.appendChild(option);
    modelSelect.classList.add("empty");
    return;
  }
  if (!activeModel) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "\u8bf7\u9009\u62e9\u6a21\u578b";
    option.disabled = true;
    option.selected = true;
    modelSelect.appendChild(option);
    modelSelect.classList.add("empty");
  } else {
    modelSelect.classList.remove("empty");
  }
  models.forEach((model) => {
    const option = document.createElement("option");
    option.value = model;
    option.textContent = model;
    modelSelect.appendChild(option);
  });
  if (activeModel) {
    modelSelect.value = activeModel;
  }
}

function addMessage(role, content, isError = false) {
  const messageEl = document.createElement("div");
  messageEl.className = `message ${role}${isError ? " error" : ""}`;
  messageEl.textContent = content;
  chatEl.appendChild(messageEl);
  chatEl.scrollTop = chatEl.scrollHeight;
  return messageEl;
}

function renderChat() {
  chatEl.innerHTML = "";
  history.forEach((message) => {
    if (message?.role && message?.content) {
      addMessage(message.role, message.content);
    }
  });
}

function buildTitle(messages) {
  const firstUser = messages.find((message) => message.role === "user");
  if (!firstUser || !firstUser.content) {
    return "New chat";
  }
  return firstUser.content.slice(0, 36);
}

function getConversation(id) {
  return conversations.find((conversation) => conversation.id === id);
}

function clearChat() {
  history = [];
  chatEl.innerHTML = "";
  setStatus("Conversation cleared");
  const conversation = getConversation(activeConversationId);
  if (conversation) {
    conversation.messages = [];
    conversation.title = "New chat";
    conversation.updatedAt = Date.now();
    persistConversations();
  }
}

function createConversation() {
  const id = `chat_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
  const now = Date.now();
  const conversation = {
    id,
    title: "New chat",
    messages: [],
    createdAt: now,
    updatedAt: now,
    pinned: false,
  };
  conversations.unshift(conversation);
  activeConversationId = id;
  history = conversation.messages;
  persistConversations();
  renderHistoryList();
  renderChat();
}

function persistConversations() {
  conversations.forEach((conversation) => {
    if (conversation.messages.length > MAX_HISTORY) {
      conversation.messages = conversation.messages.slice(
        conversation.messages.length - MAX_HISTORY
      );
    }
  });
  setLocalStorage({ conversations, activeConversationId });
}

async function loadConversations() {
  const data = await getLocalStorage({
    conversations: [],
    activeConversationId: "",
    history: [],
  });
  conversations = Array.isArray(data.conversations) ? data.conversations : [];
  activeConversationId = data.activeConversationId || "";

  if (conversations.length === 0 && Array.isArray(data.history) && data.history.length > 0) {
    const now = Date.now();
    const migrated = {
      id: `chat_${now}`,
      title: buildTitle(data.history),
      messages: data.history,
      createdAt: now,
      updatedAt: now,
      pinned: false,
    };
    conversations = [migrated];
    activeConversationId = migrated.id;
  }

  if (!activeConversationId || !getConversation(activeConversationId)) {
    if (conversations.length > 0) {
      activeConversationId = conversations[0].id;
    } else {
      createConversation();
      return;
    }
  }

  const conversation = getConversation(activeConversationId);
  history = conversation ? conversation.messages : [];
  renderHistoryList();
  renderChat();
  persistConversations();
}

function setActiveConversation(id) {
  const conversation = getConversation(id);
  if (!conversation) {
    return;
  }
  activeConversationId = id;
  history = conversation.messages;
  renderChat();
  renderHistoryList();
  persistConversations();
}

function renderHistoryList() {
  historyList.innerHTML = "";
  const term = historyFilter.trim().toLowerCase();
  const sorted = [...conversations].sort((a, b) => {
    if (a.pinned && !b.pinned) {
      return -1;
    }
    if (!a.pinned && b.pinned) {
      return 1;
    }
    return (b.updatedAt || 0) - (a.updatedAt || 0);
  });

  sorted.forEach((conversation) => {
    if (term) {
      const haystack = `${conversation.title || ""} ${conversation.messages?.[0]?.content || ""}`
        .toLowerCase()
        .trim();
      if (!haystack.includes(term)) {
        return;
      }
    }
    const item = document.createElement("div");
    item.className = "history-item";
    if (conversation.id === activeConversationId) {
      item.classList.add("active");
    }

    const title = document.createElement("div");
    title.className = "history-item-title";
    title.textContent = conversation.title || "New chat";

    const meta = document.createElement("div");
    meta.className = "history-item-meta";
    meta.textContent = conversation.updatedAt
      ? new Date(conversation.updatedAt).toLocaleString()
      : "Just now";

    const actions = document.createElement("div");
    actions.className = "history-item-actions";
    const pin = document.createElement("button");
    pin.type = "button";
    pin.textContent = conversation.pinned ? "Unpin" : "Pin";
    const rename = document.createElement("button");
    rename.type = "button";
    rename.textContent = "Rename";
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Delete";
    remove.className = "danger";
    actions.appendChild(pin);
    actions.appendChild(rename);
    actions.appendChild(remove);

    item.appendChild(title);
    item.appendChild(meta);
    item.appendChild(actions);
    historyList.appendChild(item);

    item.addEventListener("click", (event) => {
      if (event.target === remove || event.target === rename || event.target === pin) {
        return;
      }
      setActiveConversation(conversation.id);
      historyPanel.classList.remove("open");
    });

    pin.addEventListener("click", () => {
      conversation.pinned = !conversation.pinned;
      conversation.updatedAt = Date.now();
      persistConversations();
      renderHistoryList();
    });

    rename.addEventListener("click", () => {
      const next = window.prompt("Rename conversation", conversation.title || "New chat");
      if (!next) {
        return;
      }
      conversation.title = next.trim() || "New chat";
      conversation.updatedAt = Date.now();
      persistConversations();
      renderHistoryList();
    });

    remove.addEventListener("click", () => {
      conversations = conversations.filter((entry) => entry.id !== conversation.id);
      if (conversation.id === activeConversationId) {
        if (conversations.length > 0) {
          activeConversationId = conversations[0].id;
        } else {
          activeConversationId = "";
          createConversation();
          return;
        }
      }
      setActiveConversation(activeConversationId);
    });
  });
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

function openMiniSettings() {
  historyPanel.classList.remove("open");
  miniSettings.classList.add("open");
}

function closeMiniSettings() {
  miniSettings.classList.remove("open");
}

function applyMiniModelOptions(models, activeModel) {
  miniModelSelect.innerHTML = "";
  if (models.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "\u8bf7\u5148\u6dfb\u52a0\u6a21\u578b";
    option.disabled = true;
    option.selected = true;
    miniModelSelect.appendChild(option);
    return;
  }
  models.forEach((model) => {
    const option = document.createElement("option");
    option.value = model;
    option.textContent = model;
    miniModelSelect.appendChild(option);
  });
  if (activeModel && models.includes(activeModel)) {
    miniModelSelect.value = activeModel;
  }
}

async function loadSettings() {
  const data = await getStorage({
    apiKey: "",
    apiUrl: "",
    model: "",
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
  availableModels = parseModels(settings.models, settings.model);
  let resolvedActive = "";
  if (settings.activeModel && availableModels.includes(settings.activeModel)) {
    resolvedActive = settings.activeModel;
  } else if (availableModels.length === 1) {
    resolvedActive = availableModels[0];
  }
  settings.activeModel = resolvedActive;
  applyModelOptions(availableModels, resolvedActive, Boolean(settings.apiKey && settings.apiUrl));
  miniApiKey.value = settings.apiKey || "";
  miniApiUrl.value = settings.apiUrl || "";
  applyMiniModelOptions(availableModels, resolvedActive);

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

  if (!settings || !settings.apiKey || !settings.apiUrl) {
    setStatus("Missing API settings", true);
    openMiniSettings();
    return;
  }
  if (!settings.activeModel) {
    setStatus("Select a model", true);
    modelSelect.focus();
    return;
  }

  isSending = true;
  sendButton.disabled = true;
  promptEl.value = "";
  addMessage("user", text);
  history.push({ role: "user", content: text });
  const conversation = getConversation(activeConversationId);
  if (conversation) {
    conversation.messages = history;
    conversation.title = buildTitle(history);
    conversation.updatedAt = Date.now();
    persistConversations();
    renderHistoryList();
  }

  setStatus("Thinking...");

  try {
    const requestBody = {
      model: settings.activeModel,
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
    if (conversation) {
      conversation.messages = history;
      conversation.updatedAt = Date.now();
      persistConversations();
      renderHistoryList();
    }
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
settingsButton.addEventListener("click", openMiniSettings);
historyClose.addEventListener("click", () => historyPanel.classList.remove("open"));
newChatButton.addEventListener("click", () => {
  createConversation();
  historyPanel.classList.remove("open");
});
historyButton.addEventListener("click", () => historyPanel.classList.toggle("open"));
historySearch.addEventListener("input", () => {
  historyFilter = historySearch.value;
  renderHistoryList();
});
miniClose.addEventListener("click", closeMiniSettings);
miniMore.addEventListener("click", openOptions);
miniSave.addEventListener("click", async () => {
  const apiKey = miniApiKey.value.trim();
  const apiUrl = miniApiUrl.value.trim();
  const modelInput = miniModelInput.value.trim();
  let models = parseModels(settings?.models || "", settings?.model || "");
  if (modelInput && !models.includes(modelInput)) {
    models = [modelInput, ...models];
  }
  const picked = miniModelSelect.value;
  const activeModel = modelInput || (picked && models.includes(picked) ? picked : "");

  await setStorage({
    apiKey,
    apiUrl,
    models: models.join(", "),
    activeModel,
    model: models[0] || modelInput || "",
  });
  miniModelInput.value = "";
  closeMiniSettings();
  loadSettings();
});
modelSelect.addEventListener("change", () => {
  const selected = modelSelect.value;
  if (!selected) {
    return;
  }
  settings.activeModel = selected;
  setStorage({ activeModel: selected });
  modelSelect.classList.remove("empty");
});
modelSelect.addEventListener("mousedown", (event) => {
  if (!settings || !settings.apiKey || !settings.apiUrl || availableModels.length === 0) {
    event.preventDefault();
    openMiniSettings();
  }
});
modelSelect.addEventListener("click", (event) => {
  if (!settings || !settings.apiKey || !settings.apiUrl || availableModels.length === 0) {
    event.preventDefault();
    openMiniSettings();
  }
});
exportButton.addEventListener("click", exportMarkdown);

loadSettings();
loadConversations();

if (ext.storage?.onChanged) {
  ext.storage.onChanged.addListener((changes, area) => {
    if (area === "sync") {
      loadSettings();
    }
  });
}
