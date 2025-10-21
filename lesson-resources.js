(function () {
  const STYLE_ID = "lesson-resources-style";
  const GEMINI_MODEL = "gemini-2.5-flash";
  const OPENAI_MODEL = "gpt-4o-mini";
  const PROVIDERS = [
    { id: "gemini", label: "Gemini 2.5 Flash", storageKey: "gemini_api_key" },
    { id: "openai", label: "OpenAI ChatGPT", storageKey: "openai_api_key" }
  ];
  const QUICK_ACTIONS = [
    {
      label: "Dersi özetle",
      prompt: "Bu dersin en önemli noktalarını başlıklar, listeler ve vurgulu ifadeler kullanarak HTML çıktısı şeklinde özetle."
    },
    {
      label: "Önemli noktalar",
      prompt: "Ders boyunca öne çıkan kavramları <h3> başlıkları ve <ul> listeleri ile vurgulayarak açıklayan bir HTML içerik üret."
    },
    {
      label: "Sınav hazırla",
      prompt: "Ders içeriğine göre 5 soruluk kısa bir sınav oluştur. Soruları numaralandır, ardından ayrı bir bölümde cevap anahtarı ver ve tüm çıktıyı HTML olarak yaz."
    }
  ];
  const HTML_GUIDANCE = [
    "Yanıtlarını her zaman geçerli HTML etiketleriyle yaz.",
    "Başlıklar için <h2>/<h3>, açıklamalar için <p>, listeler için <ul>/<ol> ve <li> kullan.",
    "Önemli kavramları <strong> veya <em> etiketleriyle vurgulayabilirsin.",
    "Çıktı görsel açıdan düzenli ve okunabilir olsun."
  ].join(" ");

  const ICONS = {
    pdf: "📄",
    video: "🎬",
    image: "🖼️",
    audio: "🎧",
    slides: "🗂️",
    html: "💡",
    link: "🔗",
    default: "📁"
  };

  const state = {
    provider: localStorage.getItem("ai_provider") || "gemini",
    keys: {
      gemini: localStorage.getItem("gemini_api_key") || "",
      openai: localStorage.getItem("openai_api_key") || ""
    },
    aiPanel: null,
    aiButton: null,
    aiMessagesContainer: null,
    aiTextarea: null,
    aiStatus: null,
    providerSelect: null,
    keyInput: null,
    loadingIndicator: null,
    isAiOpen: false,
    isAiBusy: false,
    currentLesson: null
  };

  const directoryCache = {
    data: null,
    promise: null
  };

  function currentKey() {
    return state.keys[state.provider] || "";
  }

  function saveKey(provider, value) {
    const trimmed = value.trim();
    state.keys[provider] = trimmed;
    const storageKey = PROVIDERS.find((p) => p.id === provider)?.storageKey;
    if (storageKey) {
      if (trimmed) {
        localStorage.setItem(storageKey, trimmed);
      } else {
        localStorage.removeItem(storageKey);
      }
    }
  }

  function saveProvider(provider) {
    state.provider = provider;
    localStorage.setItem("ai_provider", provider);
  }

  function normaliseResourcePath(rawPath) {
    if (!rawPath || /^https?:\/\//i.test(rawPath)) {
      return rawPath;
    }
    return rawPath
      .split("/")
      .map((segment) => {
        if (segment === "." || segment === "..") {
          return segment;
        }
        return encodeURIComponent(segment);
      })
      .join("/");
  }

  function getSiteBasePath() {
    const marker = "/lessons/";
    const index = window.location.pathname.indexOf(marker);
    if (index === -1) {
      return "";
    }
    return window.location.pathname.slice(0, index);
  }

  function combineWithBase(path) {
    const base = getSiteBasePath();
    const normalised = path.startsWith("/") ? path : `/${path}`;
    if (!base) {
      return normalised;
    }
    if (base.endsWith("/")) {
      return `${base}${normalised.slice(1)}`;
    }
    return `${base}${normalised}`;
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .lesson-resource-nav {
        position: fixed;
        top: 0.75rem;
        left: 0;
        right: 0;
        z-index: 9990;
        display: flex;
        justify-content: center;
        padding: 0 1.2rem;
        pointer-events: none;
      }

      .lesson-resource-nav-inner {
        display: flex;
        gap: 0.6rem;
        align-items: center;
        justify-content: center;
        background: rgba(15, 23, 42, 0.92);
        border: 1px solid rgba(148, 163, 184, 0.35);
        border-radius: 9999px;
        padding: 0.58rem 1.3rem;
        box-shadow: 0 18px 40px rgba(15, 23, 42, 0.28);
        backdrop-filter: blur(16px);
        pointer-events: all;
      }

      .lesson-resource-home-link {
        color: #f8fafc;
        font-size: 0.9rem;
        font-weight: 600;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        transition: opacity 0.2s ease;
      }

      .lesson-resource-home-link:hover {
        opacity: 0.85;
      }

      .lesson-resource-switcher {
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
        color: #cbd5f5;
        font-size: 0.85rem;
        font-weight: 600;
      }

      .lesson-resource-switcher select {
        background: rgba(30, 41, 59, 0.9);
        border: 1px solid rgba(148, 163, 184, 0.35);
        border-radius: 9999px;
        color: inherit;
        font: inherit;
        cursor: pointer;
        padding: 0.35rem 1rem;
        appearance: none;
        box-shadow: 0 14px 28px rgba(15, 23, 42, 0.3);
      }

      .lesson-resource-widget {
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        z-index: 9990;
        font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 0.85rem;
      }

      .lesson-ai-wrapper,
      .lesson-resource-wrapper {
        position: relative;
        display: flex;
        justify-content: flex-end;
        align-items: flex-end;
      }

      .lesson-ai-button,
      .lesson-resource-toggle {
        border: none;
        border-radius: 9999px;
        padding: 0.78rem 1.55rem;
        font-size: 0.95rem;
        font-weight: 600;
        color: #f8fafc;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 0.6rem;
        transition: transform 0.25s ease, box-shadow 0.25s ease, background 0.25s ease;
      }

      .lesson-ai-button {
        background: linear-gradient(135deg, #22c55e, #16a34a);
        box-shadow: 0 18px 40px rgba(34, 197, 94, 0.35);
      }

      .lesson-ai-button:hover {
        transform: translateY(-3px);
        box-shadow: 0 24px 50px rgba(34, 197, 94, 0.4);
      }

      .lesson-resource-toggle {
        background: linear-gradient(135deg, #6366f1, #a855f7, #ec4899);
        box-shadow: 0 18px 40px rgba(99, 102, 241, 0.35);
      }

      .lesson-resource-toggle:hover {
        transform: translateY(-3px);
        box-shadow: 0 24px 50px rgba(99, 102, 241, 0.4);
      }

      .lesson-resource-panel,
      .lesson-ai-panel {
        position: absolute;
        right: 0;
        bottom: calc(100% + 0.75rem);
        margin: 0;
        width: min(26rem, 92vw);
        background: rgba(15, 23, 42, 0.9);
        border-radius: 1.1rem;
        padding: 1.25rem;
        border: 1px solid rgba(148, 163, 184, 0.25);
        box-shadow: 0 24px 60px rgba(15, 23, 42, 0.4);
        backdrop-filter: blur(18px);
        opacity: 0;
        transform: translateY(12px);
        pointer-events: none;
        transition: opacity 0.3s ease, transform 0.3s ease;
        z-index: 10;
      }

      .lesson-resource-panel.open,
      .lesson-ai-panel.open {
        opacity: 1;
        transform: translateY(0);
        pointer-events: auto;
      }

      .lesson-resource-panel-header,
      .lesson-ai-panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 1rem;
        color: #e2e8f0;
      }

      .lesson-resource-panel-title,
      .lesson-ai-panel-title {
        font-size: 1.1rem;
        font-weight: 700;
      }

      .lesson-resource-close,
      .lesson-ai-close,
      .lesson-ai-key-toggle {
        border: none;
        background: transparent;
        color: #cbd5f5;
        cursor: pointer;
        font-size: 1.05rem;
        line-height: 1;
        padding: 0.25rem 0.6rem;
        border-radius: 9999px;
        transition: background 0.2s ease;
      }

      .lesson-resource-close:hover,
      .lesson-ai-close:hover,
      .lesson-ai-key-toggle:hover {
        background: rgba(148, 163, 184, 0.15);
      }

      .lesson-resource-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        gap: 0.75rem;
      }

      .lesson-resource-item a {
        display: flex;
        align-items: center;
        gap: 0.7rem;
        text-decoration: none;
        padding: 0.75rem;
        border-radius: 0.85rem;
        background: rgba(30, 41, 59, 0.65);
        border: 1px solid rgba(148, 163, 184, 0.2);
        color: #e2e8f0;
        transition: background 0.25s ease, border-color 0.25s ease, transform 0.25s ease;
      }

      .lesson-resource-item a:hover {
        background: rgba(59, 130, 246, 0.12);
        border-color: rgba(96, 165, 250, 0.5);
        transform: translateY(-2px);
      }

      .lesson-resource-empty {
        color: #cbd5f5;
        font-size: 0.95rem;
        padding: 0.75rem;
        background: rgba(30, 41, 59, 0.65);
        border-radius: 0.85rem;
        border: 1px dashed rgba(148, 163, 184, 0.35);
      }

      .lesson-ai-hint {
        font-size: 0.78rem;
        color: rgba(226, 232, 240, 0.72);
        margin-bottom: 0.75rem;
      }

      .lesson-ai-provider {
        display: flex;
        gap: 0.5rem;
        align-items: center;
        margin-bottom: 0.75rem;
      }

      .lesson-ai-provider label {
        font-size: 0.78rem;
        font-weight: 600;
        color: rgba(226, 232, 240, 0.8);
      }

      .lesson-ai-provider select {
        background: rgba(15, 23, 42, 0.65);
        border: 1px solid rgba(148, 163, 184, 0.35);
        border-radius: 0.6rem;
        color: #f8fafc;
        font-size: 0.82rem;
        padding: 0.45rem 0.9rem;
        cursor: pointer;
      }

      .lesson-ai-prompt-buttons {
        display: flex;
        flex-wrap: wrap;
        gap: 0.55rem;
        margin-bottom: 0.85rem;
      }

      .lesson-ai-prompt-buttons button {
        border: 1px solid rgba(148, 163, 184, 0.35);
        background: rgba(30, 41, 59, 0.65);
        color: #e2e8f0;
        border-radius: 9999px;
        padding: 0.45rem 0.9rem;
        font-size: 0.82rem;
        font-weight: 600;
        cursor: pointer;
        transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
      }

      .lesson-ai-prompt-buttons button:hover {
        transform: translateY(-2px);
        box-shadow: 0 14px 28px rgba(15, 23, 42, 0.3);
      }

      .lesson-ai-messages {
        background: rgba(15, 23, 42, 0.6);
        border: 1px solid rgba(148, 163, 184, 0.2);
        border-radius: 0.85rem;
        padding: 0.75rem;
        max-height: 220px;
        overflow-y: auto;
        display: grid;
        gap: 0.65rem;
        margin-bottom: 0.85rem;
      }

      .lesson-ai-message {
        background: rgba(30, 41, 59, 0.75);
        border-radius: 0.75rem;
        padding: 0.6rem 0.75rem;
        font-size: 0.86rem;
        line-height: 1.55;
      }

      .lesson-ai-message[data-role="user"] {
        background: rgba(37, 99, 235, 0.22);
        border: 1px solid rgba(59, 130, 246, 0.35);
      }

      .lesson-ai-message[data-role="model"] {
        border: 1px solid rgba(148, 163, 184, 0.18);
      }

      .lesson-ai-form {
        display: flex;
        flex-direction: column;
        gap: 0.65rem;
      }

      .lesson-ai-textarea {
        width: 100%;
        min-height: 70px;
        background: rgba(15, 23, 42, 0.55);
        border: 1px solid rgba(148, 163, 184, 0.3);
        border-radius: 0.75rem;
        padding: 0.75rem;
        color: #f8fafc;
        font-family: inherit;
        font-size: 0.9rem;
        resize: vertical;
      }

      .lesson-ai-textarea:focus {
        outline: none;
        border-color: rgba(96, 165, 250, 0.65);
        box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.2);
      }

      .lesson-ai-actions {
        display: flex;
        gap: 0.6rem;
        align-items: center;
        justify-content: flex-end;
      }

      .lesson-ai-status {
        font-size: 0.78rem;
        color: rgba(226, 232, 240, 0.65);
      }

      .lesson-ai-send {
        border: none;
        border-radius: 9999px;
        padding: 0.55rem 1.35rem;
        font-size: 0.88rem;
        font-weight: 600;
        background: linear-gradient(135deg, #0ea5e9, #6366f1);
        color: #f8fafc;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }

      .lesson-ai-send:hover {
        transform: translateY(-2px);
        box-shadow: 0 16px 32px rgba(14, 165, 233, 0.35);
      }

      .lesson-ai-key-panel {
        display: none;
        flex-direction: column;
        gap: 0.55rem;
        margin-bottom: 0.85rem;
        background: rgba(30, 41, 59, 0.55);
        border: 1px dashed rgba(148, 163, 184, 0.35);
        border-radius: 0.75rem;
        padding: 0.75rem 0.85rem;
      }

      .lesson-ai-key-panel label {
        font-size: 0.78rem;
        color: rgba(226, 232, 240, 0.7);
      }

      .lesson-ai-key-input {
        width: 100%;
        background: rgba(15, 23, 42, 0.65);
        border: 1px solid rgba(148, 163, 184, 0.3);
        border-radius: 0.6rem;
        padding: 0.55rem;
        color: #f8fafc;
        font-family: inherit;
        font-size: 0.85rem;
      }

      .lesson-ai-key-save {
        border: none;
        border-radius: 9999px;
        padding: 0.45rem 1rem;
        font-size: 0.8rem;
        font-weight: 600;
        background: rgba(59, 130, 246, 0.75);
        color: #f8fafc;
        cursor: pointer;
        align-self: flex-end;
      }

      .lesson-ai-loading {
        display: inline-flex;
        gap: 0.35rem;
        align-items: center;
      }

      .lesson-ai-loading-dot {
        width: 8px;
        height: 8px;
        border-radius: 999px;
        background: rgba(250, 250, 250, 0.85);
        animation: lesson-ai-pulse 0.9s ease-in-out infinite;
      }

      .lesson-ai-loading-dot:nth-child(2) {
        animation-delay: 0.15s;
      }

      .lesson-ai-loading-dot:nth-child(3) {
        animation-delay: 0.3s;
      }

      @keyframes lesson-ai-pulse {
        0%, 100% { opacity: 0.2; transform: translateY(0); }
        50% { opacity: 1; transform: translateY(-3px); }
      }

      @media (max-width: 640px) {
        .lesson-resource-nav {
          top: 0.6rem;
          padding: 0 0.6rem;
        }

        .lesson-resource-nav-inner {
          gap: 0.5rem;
          padding: 0.65rem 0.95rem;
          flex-wrap: nowrap;
          overflow-x: auto;
        }

        .lesson-resource-switcher select {
          padding: 0.35rem 0.85rem;
          max-width: 130px;
        }

        .lesson-resource-widget {
          right: 0.9rem;
          bottom: 1rem;
        }

        .lesson-ai-button,
        .lesson-resource-toggle {
          padding: 0.7rem 1.25rem;
        }
      }

      @media (max-width: 420px) {
        .lesson-resource-nav {
          padding: 0 0.45rem;
        }

        .lesson-resource-home-link,
        .lesson-resource-switcher {
          font-size: 0.8rem;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function resolveIcon(type) {
    if (!type) {
      return ICONS.default;
    }
    return ICONS[type] || ICONS.default;
  }

  function inferTypeFromUrl(url, fallback) {
    if (fallback) {
      return fallback;
    }
    if (!url) {
      return "default";
    }
    const normalized = url.split("?")[0].toLowerCase();
    if (normalized.endsWith(".pdf")) {
      return "pdf";
    }
    if (/\.(png|jpe?g|gif|webp)$/.test(normalized)) {
      return "image";
    }
    if (/\.(mp4|webm|mov)$/.test(normalized)) {
      return "video";
    }
    if (/\.(mp3|wav|aac)$/.test(normalized)) {
      return "audio";
    }
    if (/\.(ppt|pptx|key)$/.test(normalized)) {
      return "slides";
    }
    if (normalized.endsWith(".html") || normalized.endsWith(".htm")) {
      return "html";
    }
    return "default";
  }

  function resolveMaterialUrl(lesson, material) {
    if (material.external && material.url) {
      return material.url;
    }

    const folder = lesson.folder || lesson.folderName || "";

    if (material.file) {
      const cleaned = material.file.replace(/^\.\//, "");
      const relative = folder ? `lessons/${folder}/${cleaned}` : cleaned;
      const encoded = normaliseResourcePath(relative);
      return combineWithBase(encoded);
    }

    if (material.path) {
      const cleaned = material.path.replace(/^\//, "");
      const encoded = normaliseResourcePath(cleaned);
      return combineWithBase(encoded);
    }

    if (material.url) {
      return material.url;
    }

    return "";
  }

  function resolveMaterials(lesson) {
    if (Array.isArray(lesson.resources)) {
      return lesson.resources;
    }
    if (Array.isArray(lesson.materials)) {
      return lesson.materials;
    }
    return [];
  }

  async function loadDirectory() {
    if (directoryCache.data) {
      return directoryCache.data;
    }

    if (Array.isArray(window.LESSON_DIRECTORY) && window.LESSON_DIRECTORY.length) {
      directoryCache.data = window.LESSON_DIRECTORY;
      return directoryCache.data;
    }

    if (!directoryCache.promise) {
      const indexPath = combineWithBase("/lessons.index.json");
      directoryCache.promise = fetch(indexPath, { cache: "no-store" })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`lessons.index.json yüklenemedi (${response.status})`);
          }
          return response.json();
        })
        .then((payload) => {
          if (Array.isArray(payload?.lessons)) {
            directoryCache.data = payload.lessons;
          } else {
            directoryCache.data = [];
          }
          return directoryCache.data;
        })
        .catch((error) => {
          console.warn("Ders dizini alınamadı:", error);
          directoryCache.data = [];
          return directoryCache.data;
        });
    }

    return directoryCache.promise;
  }

  function appendAiMessage(role, content, isHtml = false) {
    if (!state.aiMessagesContainer) {
      return;
    }
    const message = document.createElement("div");
    message.className = "lesson-ai-message";
    message.dataset.role = role;
    if (isHtml) {
      message.innerHTML = content;
    } else {
      message.textContent = content;
    }
    state.aiMessagesContainer.appendChild(message);
    state.aiMessagesContainer.scrollTop = state.aiMessagesContainer.scrollHeight;
  }

  function setAiStatus(text) {
    if (!state.aiStatus) {
      return;
    }
    state.aiStatus.textContent = text || "";
  }

  function showLoading() {
    if (!state.aiMessagesContainer) {
      return;
    }
    const loader = document.createElement("div");
    loader.className = "lesson-ai-loading";
    loader.innerHTML = '<span class="lesson-ai-loading-dot"></span><span class="lesson-ai-loading-dot"></span><span class="lesson-ai-loading-dot"></span>';
    state.aiMessagesContainer.appendChild(loader);
    state.loadingIndicator = loader;
    state.aiMessagesContainer.scrollTop = state.aiMessagesContainer.scrollHeight;
  }

  function hideLoading() {
    if (state.loadingIndicator?.parentNode) {
      state.loadingIndicator.parentNode.removeChild(state.loadingIndicator);
    }
    state.loadingIndicator = null;
  }

  async function callGeminiAPI(question, lessonHtml) {
    const key = currentKey();
    if (!key) {
      throw new Error("Gemini API anahtarı tanımlı değil.");
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;
    const payload = {
      contents: [
        {
          role: "user",
          parts: [
            { text: HTML_GUIDANCE },
            { text: `Kullanıcının isteği:\n${question}` },
            { text: `İlgili ders HTML içeriği (gizli kalmalıdır):\n${lessonHtml}` }
          ]
        }
      ]
    };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || response.statusText || "Gemini isteği başarısız oldu.");
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text).join("").trim();
    if (!text) {
      throw new Error("Gemini yanıt üretmedi.");
    }
    return text;
  }

  async function callOpenAIAPI(question, lessonHtml) {
    const key = currentKey();
    if (!key) {
      throw new Error("OpenAI API anahtarı tanımlı değil.");
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: "system", content: HTML_GUIDANCE },
          { role: "user", content: `Kullanıcının isteği:\n${question}` },
          { role: "user", content: `İlgili ders HTML içeriği (gizli kalmalıdır):\n${lessonHtml}` }
        ],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || response.statusText || "OpenAI isteği başarısız oldu.");
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) {
      throw new Error("OpenAI yanıt üretmedi.");
    }
    return text;
  }

  async function requestAiCompletion(question, lessonHtml) {
    if (state.provider === "gemini") {
      return callGeminiAPI(question, lessonHtml);
    }
    if (state.provider === "openai") {
      return callOpenAIAPI(question, lessonHtml);
    }
    throw new Error("Desteklenmeyen sağlayıcı.");
  }

  function renderAiPanel(container, lesson) {
    const panel = document.createElement("div");
    panel.className = "lesson-ai-panel";

    const header = document.createElement("div");
    header.className = "lesson-ai-panel-header";

    const title = document.createElement("div");
    title.className = "lesson-ai-panel-title";
    title.textContent = "Yapay zekaya sor";

    const headerControls = document.createElement("div");
    headerControls.style.display = "flex";
    headerControls.style.alignItems = "center";
    headerControls.style.gap = "0.35rem";

    const keyToggle = document.createElement("button");
    keyToggle.className = "lesson-ai-key-toggle";
    keyToggle.type = "button";
    keyToggle.textContent = "API anahtarı";

    const closeButton = document.createElement("button");
    closeButton.className = "lesson-ai-close";
    closeButton.type = "button";
    closeButton.textContent = "×";

    headerControls.appendChild(keyToggle);
    headerControls.appendChild(closeButton);
    header.appendChild(title);
    header.appendChild(headerControls);
    panel.appendChild(header);

    const providerRow = document.createElement("div");
    providerRow.className = "lesson-ai-provider";
    const providerLabelEl = document.createElement("label");
    providerLabelEl.textContent = "Sağlayıcı:";

    const providerSelect = document.createElement("select");
    PROVIDERS.forEach((provider) => {
      const option = document.createElement("option");
      option.value = provider.id;
      option.textContent = provider.label;
      if (provider.id === state.provider) {
        option.selected = true;
      }
      providerSelect.appendChild(option);
    });
    providerRow.appendChild(providerLabelEl);
    providerRow.appendChild(providerSelect);
    panel.appendChild(providerRow);

    const hint = document.createElement("div");
    hint.className = "lesson-ai-hint";
    hint.textContent = "Her istek mevcut dersin HTML içeriğiyle birlikte gönderilir. Yanıtlar seçilen sağlayıcının API anahtarıyla üretilir.";
    panel.appendChild(hint);

    const messages = document.createElement("div");
    messages.className = "lesson-ai-messages";
    panel.appendChild(messages);

    const promptButtons = document.createElement("div");
    promptButtons.className = "lesson-ai-prompt-buttons";
    QUICK_ACTIONS.forEach((action) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = action.label;
      button.addEventListener("click", () => {
        state.aiTextarea.value = action.prompt;
        state.aiTextarea.focus();
      });
      promptButtons.appendChild(button);
    });
    panel.appendChild(promptButtons);

    const form = document.createElement("form");
    form.className = "lesson-ai-form";

    const textarea = document.createElement("textarea");
    textarea.className = "lesson-ai-textarea";
    textarea.placeholder = "Sorunuzu veya isteğinizi yazın...";

    const actions = document.createElement("div");
    actions.className = "lesson-ai-actions";

    const status = document.createElement("div");
    status.className = "lesson-ai-status";

    const sendButton = document.createElement("button");
    sendButton.type = "submit";
    sendButton.className = "lesson-ai-send";
    sendButton.innerHTML = "Gönder ➜";

    actions.appendChild(status);
    actions.appendChild(sendButton);
    form.appendChild(textarea);
    form.appendChild(actions);
    panel.appendChild(form);

    const keyPanel = document.createElement("div");
    keyPanel.className = "lesson-ai-key-panel";

    const keyLabel = document.createElement("label");
    keyLabel.textContent = "API anahtarınızı girin. Anahtar cihazınızda saklanır ve paylaşılmaz.";

    const keyInput = document.createElement("input");
    keyInput.className = "lesson-ai-key-input";
    keyInput.type = "password";
    keyInput.placeholder = "API anahtarını buraya girin";
    keyInput.value = currentKey();

    const keySave = document.createElement("button");
    keySave.type = "button";
    keySave.className = "lesson-ai-key-save";
    keySave.textContent = "Kaydet";

    keyPanel.appendChild(keyLabel);
    keyPanel.appendChild(keyInput);
    keyPanel.appendChild(keySave);
    panel.insertBefore(keyPanel, messages);

    keyPanel.style.display = currentKey() ? "none" : "flex";

    keyToggle.addEventListener("click", () => {
      keyPanel.style.display = keyPanel.style.display === "flex" ? "none" : "flex";
    });

    keySave.addEventListener("click", () => {
      saveKey(state.provider, keyInput.value);
      setAiStatus(currentKey() ? "API anahtarı kaydedildi." : "API anahtarı temizlendi.");
      keyPanel.style.display = currentKey() ? "none" : "flex";
      setTimeout(() => setAiStatus(""), 2000);
    });

    closeButton.addEventListener("click", () => {
      panel.classList.remove("open");
      state.isAiOpen = false;
    });

    providerSelect.addEventListener("change", () => {
      saveProvider(providerSelect.value);
      keyInput.value = currentKey();
      keyPanel.style.display = currentKey() ? "none" : "flex";
      messages.innerHTML = "";
      appendAiMessage(
        "model",
        `Seçilen sağlayıcı: <strong>${PROVIDERS.find((p) => p.id === state.provider)?.label}</strong>. ${currentKey() ? "Anahtar tanımlandı, sorularınızı alabilirim." : "Başlamak için API anahtarınızı kaydedebilirsiniz."}`,
        true
      );
      state.aiTextarea.value = "";
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && panel.classList.contains("open")) {
        panel.classList.remove("open");
        state.isAiOpen = false;
      }
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (state.isAiBusy) {
        return;
      }
      const question = textarea.value.trim();
      if (!question) {
        setAiStatus("Lütfen bir soru girin.");
        return;
      }

      appendAiMessage("user", question);
      textarea.value = "";
      setAiStatus(currentKey() ? "Yanıt hazırlanıyor..." : "API anahtarı tanımlanmadı, deneme modundasınız.");
      showLoading();
      state.isAiBusy = true;

      if (!currentKey()) {
        setTimeout(() => {
          hideLoading();
          appendAiMessage(
            "model",
            "Bu özellik üzerinde çalışıyoruz. Lütfen bir API anahtarı kaydedin veya daha sonra tekrar deneyin.",
            false
          );
          setAiStatus("");
          state.isAiBusy = false;
        }, 400);
        return;
      }

      try {
        const lessonHtml = document.documentElement?.outerHTML || "";
        const reply = await requestAiCompletion(question, lessonHtml);
        hideLoading();
        appendAiMessage("model", reply, true);
        setAiStatus("");
      } catch (error) {
        hideLoading();
        appendAiMessage("model", `Bir hata oluştu: ${error.message}`, false);
        setAiStatus("");
      } finally {
        state.isAiBusy = false;
      }
    });

    state.aiPanel = panel;
    state.aiMessagesContainer = messages;
    state.aiTextarea = textarea;
    state.aiStatus = status;
    state.providerSelect = providerSelect;
    state.keyInput = keyInput;

    container.appendChild(panel);

    const providerLabel = PROVIDERS.find((p) => p.id === state.provider)?.label || "Seçim yapılmadı";
    appendAiMessage(
      "model",
      `Yapay zeka paneline hoş geldiniz. Aktif sağlayıcı: <strong>${providerLabel}</strong>. ${currentKey() ? "Anahtarınız kayıtlı, sorularınızı alabilirim." : "Başlamak için API anahtarınızı kaydedebilirsiniz."}`,
      true
    );
  }

  function renderResources(lesson) {
    const materials = resolveMaterials(lesson);
    const widget = document.createElement("div");
    widget.className = "lesson-resource-widget";

    const aiWrapper = document.createElement("div");
    aiWrapper.className = "lesson-ai-wrapper";

    const resourceWrapper = document.createElement("div");
    resourceWrapper.className = "lesson-resource-wrapper";

    const resourceToggle = document.createElement("button");
    resourceToggle.className = "lesson-resource-toggle";
    resourceToggle.type = "button";
    resourceToggle.innerHTML = `Ek Kaynaklar <span>(${materials.length})</span>`;

    const resourcePanel = document.createElement("div");
    resourcePanel.className = "lesson-resource-panel";
    resourcePanel.id = "ders-kaynaklari";

    const panelHeader = document.createElement("div");
    panelHeader.className = "lesson-resource-panel-header";

    const panelTitle = document.createElement("div");
    panelTitle.className = "lesson-resource-panel-title";
    panelTitle.textContent = "Ders materyalleri";

    const panelClose = document.createElement("button");
    panelClose.className = "lesson-resource-close";
    panelClose.type = "button";
    panelClose.setAttribute("aria-label", "Kaynak panelini kapat");
    panelClose.textContent = "×";

    panelHeader.appendChild(panelTitle);
    panelHeader.appendChild(panelClose);
    resourcePanel.appendChild(panelHeader);

    if (!materials.length) {
      const empty = document.createElement("div");
      empty.className = "lesson-resource-empty";
      empty.textContent = "Bu ders için henüz ek materyal eklenmemiş.";
      resourcePanel.appendChild(empty);
    } else {
      const list = document.createElement("ul");
      list.className = "lesson-resource-list";

      materials.forEach((material) => {
        const item = document.createElement("li");
        item.className = "lesson-resource-item";

        const link = document.createElement("a");
        const url = resolveMaterialUrl(lesson, material);
        link.href = url;
        link.rel = "noopener";
        link.target = material.external ? "_blank" : "_self";
        const label = material.label || material.title || material.filename || "Materyal";
        link.textContent = label;

        const icon = document.createElement("span");
        const type = material.type || inferTypeFromUrl(url, material.type);
        icon.textContent = resolveIcon(type);

        link.prepend(icon);
        link.addEventListener("click", (event) => {
          if (!material.external && window.ResourceViewer) {
            event.preventDefault();
            window.ResourceViewer.open({
              url,
              label,
              type,
              downloadUrl: url,
              external: Boolean(material.external)
            });
          }
        });

        item.appendChild(link);
        list.appendChild(item);
      });

      resourcePanel.appendChild(list);
    }

    resourceToggle.addEventListener("click", () => {
      const isOpen = resourcePanel.classList.toggle("open");
      resourceToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });

    panelClose.addEventListener("click", () => {
      resourcePanel.classList.remove("open");
      resourceToggle.setAttribute("aria-expanded", "false");
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && resourcePanel.classList.contains("open")) {
        resourcePanel.classList.remove("open");
        resourceToggle.setAttribute("aria-expanded", "false");
      }
    });

    const aiButton = document.createElement("button");
    aiButton.type = "button";
    aiButton.className = "lesson-ai-button";
    aiButton.innerHTML = "🤖 Yapay zekaya sor";

    aiButton.addEventListener("click", () => {
      if (!state.aiPanel) {
        renderAiPanel(aiWrapper, lesson);
      }
      state.aiPanel.classList.toggle("open");
      state.isAiOpen = state.aiPanel.classList.contains("open");
      if (state.isAiOpen && state.aiTextarea) {
        state.aiTextarea.focus();
      }
    });

    resourceWrapper.appendChild(resourceToggle);
    resourceWrapper.appendChild(resourcePanel);
    aiWrapper.appendChild(aiButton);

    widget.appendChild(aiWrapper);
    widget.appendChild(resourceWrapper);

    state.aiButton = aiButton;
    state.currentLesson = lesson;

    return widget;
  }

  function renderLessonNavigation(currentLesson, directory) {
    const nav = document.createElement("div");
    nav.className = "lesson-resource-nav";

    const navInner = document.createElement("div");
    navInner.className = "lesson-resource-nav-inner";

    const homeLink = document.createElement("a");
    homeLink.className = "lesson-resource-home-link";
    homeLink.href = combineWithBase("/index.html");
    homeLink.innerHTML = "← Ders Merkezi";
    navInner.appendChild(homeLink);

    const switcher = document.createElement("div");
    switcher.className = "lesson-resource-switcher";

    const switcherLabel = document.createElement("span");
    switcherLabel.textContent = "Hafta";
    switcher.appendChild(switcherLabel);

    const select = document.createElement("select");
    select.setAttribute("aria-label", "Diğer dersler");

    directory
      .slice()
      .sort((a, b) => a.week - b.week)
      .forEach((lesson) => {
        const option = document.createElement("option");
        option.value = lesson.id;
        option.textContent = `Hafta ${String(lesson.week).padStart(2, "0")}`;
        if (lesson.id === currentLesson.id) {
          option.selected = true;
        }
        select.appendChild(option);
      });

    select.addEventListener("change", (event) => {
      const targetLesson = directory.find((entry) => entry.id === event.target.value);
      if (!targetLesson) {
        return;
      }
      const path = targetLesson.lessonPath || targetLesson.htmlFile;
      if (!path) {
        return;
      }
      const encoded = normaliseResourcePath(path);
      window.location.href = combineWithBase(encoded);
    });

    switcher.appendChild(select);
    navInner.appendChild(switcher);
    nav.appendChild(navInner);
    document.body.appendChild(nav);
  }

  function renderResourcesWidget(lesson) {
    const widget = renderResources(lesson);
    document.body.appendChild(widget);
  }

  async function initialise(lessonId) {
    injectStyles();

    const directory = await loadDirectory();
    if (!directory.length) {
      console.warn("Ders dizini boş olduğundan kaynak paneli oluşturulamadı.");
      return;
    }

    const lesson = directory.find((entry) => entry.id === lessonId);
    if (!lesson) {
      console.warn(`Ders verisi bulunamadı: ${lessonId}`);
      return;
    }

    renderLessonNavigation(lesson, directory);
    renderResourcesWidget(lesson);
  }

  window.initLessonResources = function initLessonResources(lessonId) {
    if (document.readyState === "loading") {
      document.addEventListener(
        "DOMContentLoaded",
        () => initialise(lessonId),
        { once: true }
      );
    } else {
      initialise(lessonId);
    }
  };
})();
