(function () {
  const STYLE_ID = "lesson-resources-style";

  const ICONS = {
    pdf: "📄",
    video: "🎬",
    image: "🖼️",
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
      .lesson-resource-home-link {
        position: fixed;
        top: 1.5rem;
        left: 1.5rem;
        z-index: 9990;
        background: rgba(15, 23, 42, 0.85);
        color: #f8fafc;
        border: 1px solid rgba(148, 163, 184, 0.35);
        border-radius: 9999px;
        padding: 0.55rem 1.2rem;
        font-size: 0.95rem;
        font-weight: 600;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        box-shadow: 0 18px 40px rgba(15, 23, 42, 0.35);
        backdrop-filter: blur(12px);
        transition: transform 0.25s ease, background 0.25s ease;
      }

      .lesson-resource-home-link:hover {
        transform: translateY(-2px);
        background: rgba(30, 41, 59, 0.9);
      }

      .lesson-resource-widget {
        position: fixed;
        bottom: 1.75rem;
        right: 1.75rem;
        z-index: 9990;
        font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
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
        margin-top: 1rem;
        width: min(22rem, 90vw);
        background: rgba(15, 23, 42, 0.88);
        border-radius: 1rem;
        padding: 1.25rem;
        border: 1px solid rgba(148, 163, 184, 0.25);
        box-shadow: 0 24px 60px rgba(15, 23, 42, 0.4);
        backdrop-filter: blur(18px);
        opacity: 0;
        transform: translateY(20px);
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
        .lesson-resource-home-link {
          top: 1rem;
          left: 1rem;
          padding: 0.5rem 1rem;
          font-size: 0.85rem;
        }

        .lesson-resource-widget {
          right: 1rem;
          bottom: 1rem;
        }

        .lesson-resource-toggle {
          padding: 0.7rem 1.2rem;
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
    if (normalized.endsWith(".png") || normalized.endsWith(".jpg") || normalized.endsWith(".jpeg") || normalized.endsWith(".gif") || normalized.endsWith(".webp")) {
      return "image";
    }
    if (normalized.endsWith(".mp4") || normalized.endsWith(".webm") || normalized.endsWith(".mov")) {
      return "video";
    }
    return "default";
  }

  function resolveMaterialUrl(material) {
    if (material.external && material.url) {
      return material.url;
    }
    if (material.path) {
      return material.path;
    }
    if (material.file && material.folder) {
      return `${material.folder}/${material.file}`;
    }
    if (material.file) {
      return material.file;
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

    if (!materials || materials.length === 0) {
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
        const materialUrl = resolveMaterialUrl(material);
        const normalisedUrl = normaliseResourcePath(materialUrl);
        link.href = normalisedUrl;
        link.rel = "noopener";
        link.target = "_blank";
        const displayLabel = material.label || material.title || material.filename || "Materyal";
        link.textContent = displayLabel;

        const icon = document.createElement("span");
        const resolvedType = material.type || inferTypeFromUrl(materialUrl, material.type);
        icon.textContent = resolveIcon(resolvedType);

        link.prepend(icon);
        link.addEventListener("click", (event) => {
          if (window.ResourceViewer) {
            event.preventDefault();
            window.ResourceViewer.open({
              url: normalisedUrl,
              label: displayLabel,
              type: resolvedType,
              downloadUrl: material.external ? null : normalisedUrl,
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
      if (isOpen) {
        toggle.setAttribute("aria-expanded", "true");
      } else {
        toggle.setAttribute("aria-expanded", "false");
      }
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

  function renderHomeLink() {
    const link = document.createElement("a");
    link.className = "lesson-resource-home-link";
    link.href = "../../index.html";
    link.innerHTML = "← Ders Merkezi";
    document.body.appendChild(link);
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
    renderHomeLink();
    renderResources(lesson);
  }

  window.initLessonResources = function initLessonResources(lessonId) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        initialise(lessonId);
      }, { once: true });
      return;
    }
    initialise(lessonId);
  };
})();
