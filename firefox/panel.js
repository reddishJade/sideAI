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
const headerNewChatButton = document.getElementById("header-new-chat");
const newChatButton = document.getElementById("new-chat");
const historySearch = document.getElementById("history-search");
const themeToggle = document.getElementById("theme-toggle");
const miniSettings = document.getElementById("mini-settings");
const miniClose = document.getElementById("mini-close");
const miniApiKey = document.getElementById("mini-api-key");
const miniApiUrl = document.getElementById("mini-api-url");
const miniModelSelect = document.getElementById("mini-model-select");
const miniModelInput = document.getElementById("mini-model-input");
const miniModelAdd = document.getElementById("mini-model-add");
const miniSave = document.getElementById("mini-save");
const miniMore = document.getElementById("mini-more");
const miniVerify = document.getElementById("mini-verify");
const miniStatus = document.getElementById("mini-status");
const statusEl = document.getElementById("status");

let history = [];
let settings = null;
let isSending = false;
let availableModels = [];
const MAX_HISTORY = 100;
let conversations = [];
let activeConversationId = "";
let historyFilter = "";
const themeOrder = ["auto", "light", "dark"];
let miniModels = [];
let autoScrollEnabled = true;
const SCROLL_THRESHOLD = 48;

function fallbackEscape(value) {
  return (value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const markdown = window.SideAiMarkdown || {
  renderMarkdown: (value) => fallbackEscape(value || "").replace(/\n/g, "<br>"),
  attachCopyHandlers: () => {},
};

function renderMessageContent(role, content) {
  const value = content || "";
  if (role === "assistant") {
    return { html: markdown.renderMarkdown(value), usesMarkdown: true };
  }
  if (role === "user" && settings?.renderUserMarkdown) {
    return { html: markdown.renderMarkdown(value), usesMarkdown: true };
  }
  return { html: fallbackEscape(value).replace(/\n/g, "<br>"), usesMarkdown: false };
}

function isNearBottom() {
  if (!chatEl) {
    return true;
  }
  const distance = chatEl.scrollHeight - chatEl.scrollTop - chatEl.clientHeight;
  return distance < SCROLL_THRESHOLD;
}

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

function themeIcon(theme) {
  switch (theme) {
    case "light":
      return "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M12 4.5a1 1 0 0 1 1 1V7a1 1 0 0 1-2 0V5.5a1 1 0 0 1 1-1ZM12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm7-5a1 1 0 0 1 1-1h1.5a1 1 0 0 1 0 2H20a1 1 0 0 1-1-1ZM3.5 11H5a1 1 0 0 1 0 2H3.5a1 1 0 0 1 0-2Zm12.02-6.52a1 1 0 0 1 1.41 0l.88.88a1 1 0 1 1-1.41 1.41l-.88-.88a1 1 0 0 1 0-1.41ZM6.19 16.89a1 1 0 0 1 1.41 0l.88.88a1 1 0 1 1-1.41 1.41l-.88-.88a1 1 0 0 1 0-1.41Zm11.25-.88a1 1 0 0 1 0 1.41l-.88.88a1 1 0 1 1-1.41-1.41l.88-.88a1 1 0 0 1 1.41 0ZM7.48 5.36a1 1 0 0 1 0 1.41l-.88.88A1 1 0 1 1 5.19 6.24l.88-.88a1 1 0 0 1 1.41 0Z\"/></svg>";
    case "dark":
      return "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M20.6 15.3a1 1 0 0 0-1.2-.2 7.5 7.5 0 0 1-10.5-10.5 1 1 0 0 0-.2-1.2 1 1 0 0 0-1.1-.2A9.5 9.5 0 1 0 20.8 16.4a1 1 0 0 0-.2-1.1Z\"/></svg>";
    default:
      return "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M12 2a9.5 9.5 0 1 0 9.5 9.5A9.5 9.5 0 0 0 12 2Zm0 17a7.5 7.5 0 1 1 7.5-7.5A7.5 7.5 0 0 1 12 19Zm0-12a4.5 4.5 0 0 0 0 9V7Z\"/></svg>";
  }
}

function updateThemeToggle(theme) {
  if (!themeToggle) {
    return;
  }
  themeToggle.innerHTML = themeIcon(theme || "auto");
  themeToggle.dataset.theme = theme || "auto";
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
    option.textContent = "No models available";
    option.disabled = true;
    option.selected = true;
    modelSelect.appendChild(option);
    modelSelect.classList.add("empty");
    return;
  }
  if (models.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Please set models";
    option.disabled = true;
    option.selected = true;
    modelSelect.appendChild(option);
    modelSelect.classList.add("empty");
    return;
  }
  if (!activeModel) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Please select a model";
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

function addMessage(role, content, isError = false, options = {}) {
  const { collapseUser = false } = options;
  const messageEl = document.createElement("div");
  messageEl.className = `message ${role}${isError ? " error" : ""}`;
  const rendered = renderMessageContent(role, content);

  if (role === "user") {
    messageEl.classList.add("collapsible");
    if (collapseUser) {
      messageEl.classList.add("collapsed");
    }
    const header = document.createElement("div");
    header.className = "message-header";
    const label = document.createElement("span");
    label.className = "message-label";
    label.textContent = "You";
    const toggle = document.createElement("button");
    toggle.className = "toggle-button";
    toggle.type = "button";
    toggle.textContent = collapseUser ? "Expand" : "Collapse";
    header.append(label, toggle);

    const body = document.createElement("div");
    body.className = "message-body";
    body.innerHTML = rendered.html;
    messageEl.append(header, body);

    toggle.addEventListener("click", () => {
      messageEl.classList.toggle("collapsed");
      toggle.textContent = messageEl.classList.contains("collapsed") ? "Expand" : "Collapse";
    });
  } else {
    messageEl.innerHTML = rendered.html;
  }

  if (rendered.usesMarkdown) {
    markdown.attachCopyHandlers(messageEl);
  }
  chatEl.appendChild(messageEl);
  if (autoScrollEnabled) {
    chatEl.scrollTop = chatEl.scrollHeight;
  }
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
    }
  }

  let current = getConversation(activeConversationId);
  if (!current && conversations.length === 0) {
    createConversation();
    return;
  }
  if (!current && conversations.length > 0) {
    activeConversationId = conversations[0].id;
    current = getConversation(activeConversationId);
  }
  if (current && (!current.messages || current.messages.length === 0)) {
    history = current.messages || [];
    renderHistoryList();
    renderChat();
    persistConversations();
    return;
  }
  if (conversations.length === 0 || (conversations[0].messages && conversations[0].messages.length > 0)) {
    createConversation();
  } else {
    activeConversationId = conversations[0].id;
    history = conversations[0].messages || [];
    renderHistoryList();
    renderChat();
  }
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

function toggleMiniSettings() {
  if (miniSettings.classList.contains("open")) {
    closeMiniSettings();
    return;
  }
  openMiniSettings();
}

function applyMiniModelOptions(models, activeModel) {
  miniModelSelect.innerHTML = "";
  if (models.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Please add a model";
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
    activeModel: "",
    theme: "auto",
    temperature: "",
    maxTokens: "",
    topP: "",
    presencePenalty: "",
    frequencyPenalty: "",
    stream: true,
    renderUserMarkdown: false,
  });
  settings = {
    apiKey: (data.apiKey || "").trim(),
    apiUrl: normalizeApiUrl(data.apiUrl || ""),
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
    renderUserMarkdown: data.renderUserMarkdown === true,
  };
  applyTheme(settings.theme);
  updateThemeToggle(settings.theme);
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
  miniModels = [...availableModels];
  applyMiniModelOptions(miniModels, resolvedActive);

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
            assistantEl.innerHTML = markdown.renderMarkdown(assistantText);
            markdown.attachCopyHandlers(assistantEl);
            if (autoScrollEnabled) {
              chatEl.scrollTop = chatEl.scrollHeight;
            }
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

  const finalText = assistantText.trim();
  if (finalText) {
    assistantEl.innerHTML = markdown.renderMarkdown(finalText);
    markdown.attachCopyHandlers(assistantEl);
  }
  return finalText;
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
  addMessage("user", text, false, { collapseUser: true });
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
settingsButton.addEventListener("click", toggleMiniSettings);
historyClose.addEventListener("click", () => historyPanel.classList.remove("open"));
chatEl.addEventListener("scroll", () => {
  autoScrollEnabled = isNearBottom();
});
headerNewChatButton.addEventListener("click", () => {
  createConversation();
});
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
  const apiUrl = normalizeApiUrl(miniApiUrl.value.trim());
  const models = [...miniModels];
  const picked = miniModelSelect.value;
  const activeModel = picked && models.includes(picked) ? picked : "";

  await setStorage({
    apiKey,
    apiUrl,
    models: models.join(", "),
    activeModel,
    model: models[0] || "",
  });
  miniModelInput.value = "";
  miniApiUrl.value = apiUrl;
  closeMiniSettings();
  loadSettings();
});
miniModelAdd.addEventListener("click", () => {
  const value = miniModelInput.value.trim();
  if (!value) {
    return;
  }
  if (!miniModels.includes(value)) {
    miniModels = [value, ...miniModels];
  }
  miniModelInput.value = "";
  applyMiniModelOptions(miniModels, value);
});
miniVerify.addEventListener("click", async () => {
  const apiKey = miniApiKey.value.trim();
  const apiUrl = miniApiUrl.value.trim();
  const model = miniModelSelect.value || miniModelInput.value.trim();
  if (!apiKey || !apiUrl || !model) {
    miniStatus.textContent = "Add API key, endpoint, and model first.";
    return;
  }
  miniStatus.textContent = "Verifying...";
  try {
    await verifyApi(apiKey, apiUrl, model);
    miniStatus.textContent = "API verified.";
  } catch (error) {
    miniStatus.textContent = "Verification failed.";
  }
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
themeToggle.addEventListener("click", async () => {
  const current = themeToggle.dataset.theme || settings?.theme || "auto";
  const index = themeOrder.indexOf(current);
  const next = themeOrder[(index + 1) % themeOrder.length];
  settings.theme = next;
  applyTheme(next);
  updateThemeToggle(next);
  await setStorage({ theme: next });
});

loadSettings();
loadConversations();

if (ext.storage?.onChanged) {
  ext.storage.onChanged.addListener((changes, area) => {
    if (area === "local") {
      loadSettings();
    }
  });
}
