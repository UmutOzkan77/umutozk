(function () {
  const STYLE_ID = "resource-viewer-style";
  const OVERLAY_ID = "resource-viewer-overlay";
  const MODAL_ID = "resource-viewer-modal";
  const CONTENT_ID = "resource-viewer-content";
  const TITLE_ID = "resource-viewer-title";
  const META_ID = "resource-viewer-meta";

  let overlayElement;
  let modalElement;
  let contentElement;
  let titleElement;
  let metaElement;
  let downloadButton;
  let openButton;

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .resource-viewer-overlay {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.75);
        backdrop-filter: blur(10px);
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        padding: 1.5rem;
      }

      .resource-viewer-overlay.is-open {
        display: flex;
      }

      .resource-viewer-modal {
        width: min(960px, 96vw);
        background: rgba(15, 23, 42, 0.95);
        border-radius: 1.25rem;
        border: 1px solid rgba(148, 163, 184, 0.25);
        box-shadow: 0 30px 80px rgba(15, 23, 42, 0.5);
        overflow: hidden;
        display: flex;
        flex-direction: column;
        max-height: 90vh;
      }

      .resource-viewer-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1rem 1.5rem;
        background: rgba(30, 41, 59, 0.75);
        border-bottom: 1px solid rgba(148, 163, 184, 0.2);
      }

      .resource-viewer-title {
        font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-size: 1rem;
        font-weight: 600;
        color: #e2e8f0;
        margin: 0;
      }

      .resource-viewer-close {
        border: none;
        background: rgba(51, 65, 85, 0.6);
        color: #cbd5f5;
        border-radius: 9999px;
        font-size: 1.2rem;
        line-height: 1;
        width: 2.25rem;
        height: 2.25rem;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: background 0.2s ease;
      }

      .resource-viewer-close:hover {
        background: rgba(99, 102, 241, 0.4);
        color: #f8fafc;
      }

      .resource-viewer-body {
        padding: 1.5rem;
        overflow: auto;
        flex: 1;
        background: rgba(15, 23, 42, 0.92);
      }

      .resource-viewer-body iframe,
      .resource-viewer-body video {
        width: 100%;
        height: 70vh;
        border: none;
        border-radius: 0.75rem;
        background: #0f172a;
      }

      .resource-viewer-body img {
        max-width: 100%;
        border-radius: 0.75rem;
        display: block;
        margin: 0 auto;
        box-shadow: 0 20px 45px rgba(15, 23, 42, 0.4);
      }

      .resource-viewer-fallback {
        display: grid;
        gap: 0.75rem;
        color: #cbd5f5;
        font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      .resource-viewer-fallback a {
        color: #5eead4;
        text-decoration: underline;
      }

      .resource-viewer-footer {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        align-items: center;
        justify-content: flex-end;
        padding: 0.85rem 1.5rem;
        background: rgba(30, 41, 59, 0.75);
        border-top: 1px solid rgba(148, 163, 184, 0.2);
      }

      .resource-viewer-meta {
        margin-right: auto;
        font-size: 0.85rem;
        color: #94a3b8;
      }

      .resource-viewer-action {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        border-radius: 9999px;
        font-size: 0.9rem;
        font-weight: 600;
        padding: 0.55rem 1.2rem;
        text-decoration: none;
        border: none;
        cursor: pointer;
        transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
      }

      .resource-viewer-action.primary {
        background: linear-gradient(135deg, #6366f1, #a855f7);
        color: #f8fafc;
        box-shadow: 0 18px 35px rgba(99, 102, 241, 0.35);
      }

      .resource-viewer-action.primary:hover {
        transform: translateY(-1px);
        box-shadow: 0 20px 40px rgba(99, 102, 241, 0.4);
      }

      .resource-viewer-action.secondary {
        background: rgba(51, 65, 85, 0.6);
        color: #e2e8f0;
      }

      .resource-viewer-action.secondary:hover {
        background: rgba(51, 65, 85, 0.75);
      }

      @media (max-width: 640px) {
        .resource-viewer-modal {
          width: 100%;
          max-height: 85vh;
        }

        .resource-viewer-body iframe,
        .resource-viewer-body video {
          height: 55vh;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function ensureElements() {
    if (overlayElement) {
      return;
    }

    overlayElement = document.createElement("div");
    overlayElement.id = OVERLAY_ID;
    overlayElement.className = "resource-viewer-overlay";
    overlayElement.setAttribute("role", "dialog");
    overlayElement.setAttribute("aria-modal", "true");
    overlayElement.setAttribute("aria-labelledby", TITLE_ID);

    modalElement = document.createElement("div");
    modalElement.id = MODAL_ID;
    modalElement.className = "resource-viewer-modal";

    const header = document.createElement("div");
    header.className = "resource-viewer-header";

    titleElement = document.createElement("h2");
    titleElement.id = TITLE_ID;
    titleElement.className = "resource-viewer-title";
    titleElement.textContent = "Materyal Önizleme";

    metaElement = document.createElement("div");
    metaElement.id = META_ID;
    metaElement.className = "resource-viewer-meta";
    metaElement.textContent = "";

    const closeButton = document.createElement("button");
    closeButton.className = "resource-viewer-close";
    closeButton.type = "button";
    closeButton.innerHTML = "&times;";
    closeButton.setAttribute("aria-label", "Materyali kapat");
    closeButton.addEventListener("click", close);

    header.appendChild(titleElement);
    header.appendChild(metaElement);
    header.appendChild(closeButton);

    const body = document.createElement("div");
    body.className = "resource-viewer-body";
    body.id = CONTENT_ID;

    modalElement.appendChild(header);
    modalElement.appendChild(body);

    const footer = document.createElement("div");
    footer.className = "resource-viewer-footer";

    downloadButton = document.createElement("a");
    downloadButton.className = "resource-viewer-action primary";
    downloadButton.innerHTML = "⬇️ İndir";
    downloadButton.setAttribute("download", "");
    downloadButton.rel = "noopener";

    openButton = document.createElement("a");
    openButton.className = "resource-viewer-action secondary";
    openButton.innerHTML = "🔗 Yeni Sekmede Aç";
    openButton.target = "_blank";
    openButton.rel = "noopener";

    footer.appendChild(downloadButton);
    footer.appendChild(openButton);
    modalElement.appendChild(footer);

    overlayElement.appendChild(modalElement);

    overlayElement.addEventListener("click", (event) => {
      if (event.target === overlayElement) {
        close();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && overlayElement.classList.contains("is-open")) {
        close();
      }
    });

    document.body.appendChild(overlayElement);
    contentElement = body;
  }

  function clearContent() {
    if (contentElement) {
      contentElement.innerHTML = "";
    }
  }

  function humanizeLabel(label) {
    if (!label) {
      return "Materyal";
    }
    return label;
  }

  function normaliseMeta({ type }) {
    if (!type) {
      return "";
    }
    const map = {
      pdf: "PDF",
      image: "Görsel",
      video: "Video",
      audio: "Ses",
      slides: "Sunum",
      link: "Bağlantı"
    };
    return map[type] || type;
  }

  function open({ url, label, type, downloadUrl, external }) {
    if (!url) {
      return;
    }

    injectStyles();
    ensureElements();
    clearContent();

    const resolvedLabel = humanizeLabel(label);
    titleElement.textContent = resolvedLabel;
    metaElement.textContent = normaliseMeta({ type });

    const finalDownloadUrl = !external ? downloadUrl || url : null;
    if (finalDownloadUrl) {
      downloadButton.href = finalDownloadUrl;
      downloadButton.style.display = "inline-flex";
    } else {
      downloadButton.style.display = "none";
    }

    openButton.href = url;
    openButton.style.display = "inline-flex";
    openButton.target = "_blank";
    openButton.rel = "noopener";

    if (type === "image") {
      const img = document.createElement("img");
      img.src = url;
      img.alt = resolvedLabel;
      img.loading = "lazy";
      contentElement.appendChild(img);
    } else if (type === "video") {
      const video = document.createElement("video");
      video.controls = true;
      video.src = url;
      video.setAttribute("playsinline", "");
      video.setAttribute("preload", "metadata");
      contentElement.appendChild(video);
    } else if (type === "pdf") {
      const iframe = document.createElement("iframe");
      iframe.src = url;
      iframe.title = resolvedLabel;
      iframe.loading = "lazy";
      contentElement.appendChild(iframe);
    } else if (type === "html") {
      const iframe = document.createElement("iframe");
      iframe.src = url;
      iframe.title = resolvedLabel;
      iframe.loading = "lazy";
      contentElement.appendChild(iframe);
    } else {
      const fallback = document.createElement("div");
      fallback.className = "resource-viewer-fallback";
      fallback.innerHTML = `
        <p>Bu dosya türü tarayıcıda önizlenemiyor.</p>
        <p><a href="${url}" download>Dosyayı indir</a> veya <a href="${url}" target="_blank" rel="noopener">yeni sekmede aç</a>.</p>
      `;
      contentElement.appendChild(fallback);
    }

    overlayElement.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }

  function close() {
    if (!overlayElement) {
      return;
    }
    overlayElement.classList.remove("is-open");
    document.body.style.overflow = "";
    clearContent();
    if (metaElement) {
      metaElement.textContent = "";
    }
  }

  window.ResourceViewer = {
    open,
    close
  };
})();
