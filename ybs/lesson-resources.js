(function () {
  const STYLE_ID = "lesson-resources-style";

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
        padding: 0 1.5rem;
        pointer-events: none;
      }

      .lesson-resource-nav-inner {
        display: flex;
        gap: 0.75rem;
        align-items: center;
        background: rgba(15, 23, 42, 0.92);
        border: 1px solid rgba(148, 163, 184, 0.35);
        border-radius: 9999px;
        padding: 0.6rem 1.6rem;
        box-shadow: 0 18px 40px rgba(15, 23, 42, 0.28);
        backdrop-filter: blur(14px);
        pointer-events: all;
      }

      .lesson-resource-home-link {
        color: #f8fafc;
        font-size: 0.95rem;
        font-weight: 600;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
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
        font-size: 0.9rem;
        font-weight: 600;
      }

      .lesson-resource-switcher select {
        background: rgba(30, 41, 59, 0.85);
        border: 1px solid rgba(148, 163, 184, 0.35);
        border-radius: 9999px;
        color: inherit;
        font: inherit;
        cursor: pointer;
        padding: 0.45rem 1.3rem;
        appearance: none;
        box-shadow: 0 14px 28px rgba(15, 23, 42, 0.35);
      }

      .lesson-resource-widget {
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        z-index: 9990;
        font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        display: flex;
        flex-direction: column-reverse;
        align-items: flex-end;
        gap: 0.75rem;
      }

      .lesson-resource-toggle {
        border: none;
        border-radius: 9999px;
        padding: 0.8rem 1.6rem;
        font-size: 1rem;
        font-weight: 600;
        color: #f8fafc;
        cursor: pointer;
        background: linear-gradient(135deg, #6366f1, #a855f7, #ec4899);
        box-shadow: 0 18px 40px rgba(99, 102, 241, 0.35);
        display: inline-flex;
        align-items: center;
        gap: 0.6rem;
        transition: transform 0.25s ease, box-shadow 0.25s ease;
      }

      .lesson-resource-toggle:hover {
        transform: translateY(-3px);
        box-shadow: 0 24px 50px rgba(99, 102, 241, 0.4);
      }

      .lesson-resource-panel {
        margin: 0;
        width: min(22rem, 90vw);
        background: rgba(15, 23, 42, 0.88);
        border-radius: 1rem;
        padding: 1.25rem;
        border: 1px solid rgba(148, 163, 184, 0.25);
        box-shadow: 0 24px 60px rgba(15, 23, 42, 0.4);
        backdrop-filter: blur(18px);
        opacity: 0;
        transform: translateY(12px);
        pointer-events: none;
        transition: opacity 0.3s ease, transform 0.3s ease;
      }

      .lesson-resource-panel.open {
        opacity: 1;
        transform: translateY(0);
        pointer-events: auto;
      }

      .lesson-resource-panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 1rem;
        color: #e2e8f0;
      }

      .lesson-resource-panel-title {
        font-size: 1.1rem;
        font-weight: 700;
      }

      .lesson-resource-close {
        border: none;
        background: transparent;
        color: #cbd5f5;
        cursor: pointer;
        font-size: 1.2rem;
        line-height: 1;
        padding: 0.2rem 0.5rem;
        border-radius: 9999px;
        transition: background 0.2s ease;
      }

      .lesson-resource-close:hover {
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

      @media (max-width: 640px) {
        .lesson-resource-nav {
          top: 0.6rem;
          padding: 0 1rem;
        }

        .lesson-resource-nav-inner {
          flex-direction: column;
          align-items: stretch;
          gap: 0.5rem;
          padding: 0.75rem 1.1rem;
          border-radius: 1.1rem;
        }

        .lesson-resource-home-link {
          justify-content: center;
        }

        .lesson-resource-switcher {
          justify-content: space-between;
        }

        .lesson-resource-switcher select {
          width: 100%;
          text-align: center;
        }

        .lesson-resource-widget {
          right: 1rem;
          bottom: 1rem;
        }

        .lesson-resource-toggle {
          padding: 0.7rem 1.2rem;
        }
      }

      @media (max-width: 420px) {
        .lesson-resource-nav {
          top: 1rem;
          left: 1rem;
        }

        .lesson-resource-home-link,
        .lesson-resource-switcher {
          font-size: 0.85rem;
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

  function renderResources(lesson) {
    const materials = resolveMaterials(lesson);
    const widget = document.createElement("div");
    widget.className = "lesson-resource-widget";

    const toggle = document.createElement("button");
    toggle.className = "lesson-resource-toggle";
    toggle.type = "button";
    toggle.innerHTML = `Ek Kaynaklar <span>(${materials.length})</span>`;

    const panel = document.createElement("div");
    panel.className = "lesson-resource-panel";
    panel.id = "ders-kaynaklari";

    const panelHeader = document.createElement("div");
    panelHeader.className = "lesson-resource-panel-header";

    const title = document.createElement("div");
    title.className = "lesson-resource-panel-title";
    title.textContent = "Ders materyalleri";

    const closeBtn = document.createElement("button");
    closeBtn.className = "lesson-resource-close";
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", "Kaynak panelini kapat");
    closeBtn.textContent = "×";

    panelHeader.appendChild(title);
    panelHeader.appendChild(closeBtn);
    panel.appendChild(panelHeader);

    if (!materials.length) {
      const emptyState = document.createElement("div");
      emptyState.className = "lesson-resource-empty";
      emptyState.textContent = "Bu ders için henüz ek materyal eklenmemiş.";
      panel.appendChild(emptyState);
    } else {
      const list = document.createElement("ul");
      list.className = "lesson-resource-list";

      materials.forEach((material) => {
        const item = document.createElement("li");
        item.className = "lesson-resource-item";

        const link = document.createElement("a");
        const materialUrl = resolveMaterialUrl(lesson, material);
        link.href = materialUrl;
        link.rel = "noopener";
        link.target = material.external ? "_blank" : "_self";
        const displayLabel = material.label || material.title || material.filename || "Materyal";
        link.textContent = displayLabel;

        const icon = document.createElement("span");
        const resolvedType = material.type || inferTypeFromUrl(materialUrl, material.type);
        icon.textContent = resolveIcon(resolvedType);

        link.prepend(icon);
        link.addEventListener("click", (event) => {
          if (!material.external && window.ResourceViewer) {
            event.preventDefault();
            window.ResourceViewer.open({
              url: materialUrl,
              label: displayLabel,
              type: resolvedType,
              downloadUrl: materialUrl,
              external: Boolean(material.external)
            });
          }
        });

        item.appendChild(link);
        list.appendChild(item);
      });

      panel.appendChild(list);
    }

    toggle.addEventListener("click", () => {
      const isOpen = panel.classList.toggle("open");
      toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });

    closeBtn.addEventListener("click", () => {
      panel.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        panel.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });

    widget.appendChild(toggle);
    widget.appendChild(panel);
    document.body.appendChild(widget);
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

    const switcherWrapper = document.createElement("div");
    switcherWrapper.className = "lesson-resource-switcher";

    const switcherLabel = document.createElement("span");
    switcherLabel.textContent = "Hafta";
    switcherWrapper.appendChild(switcherLabel);

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

    switcherWrapper.appendChild(select);
    navInner.appendChild(switcherWrapper);
    nav.appendChild(navInner);
    document.body.appendChild(nav);
  }

  function initialise(lessonId) {
    const directory = Array.isArray(window.LESSON_DIRECTORY) ? window.LESSON_DIRECTORY : null;

    if (!directory || directory.length === 0) {
      console.warn("LESSON_DIRECTORY verisi bulunamadı veya boş.");
      return;
    }

    const lesson = directory.find((entry) => entry.id === lessonId);

    if (!lesson) {
      console.warn(`Ders verisi bulunamadı: ${lessonId}`);
      return;
    }

    injectStyles();
    renderLessonNavigation(lesson, directory);
    renderResources(lesson);
  }

  window.initLessonResources = function initLessonResources(lessonId) {
    if (document.readyState === "loading") {
      document.addEventListener(
        "DOMContentLoaded",
        () => {
          initialise(lessonId);
        },
        { once: true }
      );
      return;
    }
    initialise(lessonId);
  };
})();
