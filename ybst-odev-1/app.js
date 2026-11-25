const api = new URL("https://ybst-odev-1-api.vercel.app/api/odev");
if (["localhost", "127.0.0.1"].includes(location.hostname)) {
  api.host = "127.0.0.1:4174";
  api.protocol = "http:";
}

const questions = [
  {
    title: "Banuybst.com ve mobil uygulamalar",
    prompt: "YBST’nin sitesi veya mobil uygulamaları için ne önerirsin? Fikrini yazabilir, tasarımını yükleyebilir ya da ikisini birden paylaşabilirsin.",
    placeholder: "Bir özellik, ekran tasarımı veya iyileştirme fikri yaz…",
  },
  {
    title: "GameFlix",
    prompt: "GameFlix için nasıl bir ürün hayal ediyorsun? Fikrini veya hazırladığın tasarımları paylaş.",
    placeholder: "GameFlix’te görmek istediğin bir şeyi anlat…",
  },
  {
    title: "Film formu ve yönetici paneli",
    prompt: "Codex veya başka bir yapay zekâ geliştirme aracıyla, yalnızca istemler vererek Perde 77 gibi çalışan bir film formu ve yönetici paneli yap. Kodunu GitHub’a gönder, siteni Vercel’de yayımla.",
    placeholder: "Nasıl yaptığını kısaca anlatabilirsin…",
  },
];

const byId = (id) => document.getElementById(id);
const profileForm = byId("profile-form");
const composer = byId("composer");
const preview = byId("preview");
const maxImageFileBytes = 5_000_000;
const maxCompressedImageBytes = 150_000;
const acceptedImages = new Set(["image/jpeg", "image/png", "image/webp"]);
const uploads = questions.map(() => []);
const pendingImages = new Set();
const profileKey = "ybst-odev-1-profile";
const browserKey = "ybst-odev-1-device";
const dateFormat = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" });
let profile = readProfile();
let previewDraft;
let publishing = false;
let feedRequest = 0;
let cursor = null;

function readProfile() {
  try {
    const saved = JSON.parse(localStorage.getItem(profileKey));
    return saved?.token && saved?.name ? saved : null;
  } catch {
    return null;
  }
}

function element(tag, css, content) {
  const node = document.createElement(tag);
  if (css) node.className = css;
  if (content !== undefined) node.textContent = content;
  return node;
}

function message(node, text = "") {
  node.textContent = text;
  node.hidden = !text;
}

function initials(name) {
  return name.split(/\s+/).slice(0, 2).map((part) => [...part][0]).join("").toLocaleUpperCase("tr");
}

function urlFor(query) {
  const url = new URL(api);
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
  return url;
}

async function request(query, body, method = body ? "POST" : "GET") {
  let response;
  try {
    response = await fetch(urlFor(query), {
      method,
      headers: {
        ...(profile && { Authorization: "Bearer " + profile.token }),
        ...(body && { "Content-Type": "application/json" }),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Bağlantı kurulamadı. İnternet bağlantını kontrol edip tekrar dene.");
  }

  const result = await response.json().catch(() => null);
  if (!response.ok || !result) {
    const error = new Error(result?.error || "İşlem tamamlanamadı. Birazdan tekrar dene.");
    error.status = response.status;
    throw error;
  }
  return result;
}

function showProfile() {
  byId("welcome").hidden = Boolean(profile);
  byId("header-profile").hidden = !profile;
  byId("refresh").hidden = !profile;
  byId("guide-reference").hidden = Boolean(profile);
  composer.hidden = true;
  byId("delivery-status").hidden = true;
  byId("delivery-count").hidden = true;
  byId("posts").replaceChildren();
  byId("more").hidden = true;
  cursor = null;

  if (!profile) {
    message(byId("feed-note"), "Paylaşımları görmek için adını ve soyadını yaz.");
    return;
  }

  for (const id of ["header-avatar", "compose-avatar"]) byId(id).textContent = initials(profile.name);
  for (const id of ["header-name", "compose-name"]) byId(id).textContent = profile.name;
  message(byId("feed-note"), "Gönderiler yükleniyor…");
  loadFeed();
}

profileForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = event.submitter;
  button.disabled = true;
  message(byId("profile-error"));
  const data = new FormData(profileForm);
  try {
    let browserId = localStorage.getItem(browserKey);
    if (!browserId) {
      browserId = crypto.randomUUID();
      localStorage.setItem(browserKey, browserId);
    }
    const nextProfile = await request({ view: "profile" }, {
      first: data.get("first"), last: data.get("last"), browserId,
    });
    localStorage.setItem(profileKey, JSON.stringify(nextProfile));
    profile = nextProfile;
    showProfile();
    byId("delivery-title").scrollIntoView({ block: "start" });
  } catch (error) {
    message(byId("profile-error"), error.message || "Bu tarayıcıda profil kaydedilemedi.");
  } finally {
    button.disabled = false;
  }
});

function clearProfile() {
  profile = null;
  try {
    localStorage.removeItem(profileKey);
  } catch {
    // The in-memory session can still be cleared if storage is unavailable.
  }
  showProfile();
}

byId("change-name").addEventListener("click", () => {
  clearProfile();
  profileForm.elements.first.focus();
});

for (const [index, question] of questions.entries()) {
  const section = element("section", "question");
  // The template only interpolates fixed assignment copy and its position.
  section.innerHTML = `
    <h3 id="question-${index}"><span class="number">${String(index + 1).padStart(2, "0")}</span>${question.title}</h3>
    <p>${question.prompt}${index === 2 ? ' <a href="https://perde77.vercel.app/" target="_blank" rel="noopener noreferrer">Perde 77’yi aç ↗</a>' : ""}</p>
    <textarea name="answer${index}" rows="3" maxlength="3500" aria-labelledby="question-${index}" placeholder="${question.placeholder}"></textarea>
    ${index === 2 ? `<div class="links">
      <label>Vercel site bağlantısı<input type="url" name="live" required maxlength="600" placeholder="https://projen.vercel.app"></label>
      <label>GitHub depo bağlantısı<input type="url" name="repo" required maxlength="600" placeholder="https://github.com/kullanici/proje"></label>
    </div>` : ""}
    <div class="upload-line">
      <button type="button" class="button secondary upload" aria-describedby="images-note-${index}"><b aria-hidden="true">＋</b> Görsel ekle</button>
      <span id="images-note-${index}">${index === 2 ? "En az 1 ekran görüntüsü" : "En çok 3 görsel"} · JPG, PNG, WebP · Görsel başına 5 MB</span>
      <input type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" multiple hidden>
    </div>
    <p class="form-error" role="alert" hidden></p>
    <div class="gallery" hidden></div>`;
  const input = section.querySelector("input[type=file]");
  const upload = section.querySelector(".upload");
  const error = section.querySelector(".form-error");
  const gallery = section.querySelector(".gallery");
  const render = () => renderGallery(gallery, uploads[index].map((image) => image.url), question.title, (position) => {
    URL.revokeObjectURL(uploads[index][position].url);
    uploads[index].splice(position, 1);
    render();
  });

  upload.addEventListener("click", () => input.click());
  input.addEventListener("change", async () => {
    const files = Array.from(input.files);
    input.value = "";
    message(error);
    if (files.length + uploads[index].length > 3) {
      message(error, "Her çalışma için en fazla 3 görsel ekleyebilirsin.");
      return;
    }
    pendingImages.add(index);
    upload.disabled = true;
    try {
      for (const file of files) {
        const image = await makeImage(file);
        const encoded = await base64(image);
        uploads[index].push({ url: URL.createObjectURL(image), encoded });
        render();
      }
    } catch (failure) {
      message(error, failure.message);
    } finally {
      pendingImages.delete(index);
      upload.disabled = false;
    }
  });
  byId("questions").append(section);
}

async function makeImage(file) {
  if (file.size > maxImageFileBytes) {
    throw new Error("Her görsel en fazla 5 MB olabilir.");
  }
  if (!acceptedImages.has(file.type) && (file.type || !/\.(jpe?g|png|webp)$/i.test(file.name))) {
    throw new Error("JPG, PNG veya WebP biçiminde bir görsel seç.");
  }

  const image = typeof createImageBitmap === "function"
    ? await createImageBitmap(file).catch(() => null)
    : null;
  const source = image ? null : URL.createObjectURL(file);
  try {
    const drawable = image || await loadImage(source);
    const canvas = document.createElement("canvas");
    const webpSupported = canvas.toDataURL("image/webp").startsWith("data:image/webp");
    const format = webpSupported ? "image/webp" : "image/jpeg";
    const context = canvas.getContext("2d", { alpha: webpSupported });
    const longEdge = Math.max(drawable.width, drawable.height);

    for (let maxSide = Math.min(1600, longEdge); maxSide >= 1; maxSide = Math.floor(maxSide * .76)) {
      const scale = maxSide / longEdge;
      canvas.width = Math.max(1, Math.round(drawable.width * scale));
      canvas.height = Math.max(1, Math.round(drawable.height * scale));
      context.imageSmoothingQuality = "high";
      if (!webpSupported) {
        context.fillStyle = "#fff";
        context.fillRect(0, 0, canvas.width, canvas.height);
      }
      context.drawImage(drawable, 0, 0, canvas.width, canvas.height);

      for (const quality of [.76, .62, .48]) {
        const encoded = await new Promise((resolve) => canvas.toBlob(resolve, format, quality));
        if (encoded?.type === format && encoded.size <= maxCompressedImageBytes) return encoded;
      }
    }
  } catch {
    throw new Error("Bu görsel açılamadı. Dosyayı yeniden seç veya farklı bir görsel dene.");
  } finally {
    image?.close();
    if (source) URL.revokeObjectURL(source);
  }
  throw new Error("Bu görsel işlenemedi. Dosyayı yeniden seç veya farklı bir görsel dene.");
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });
}

function base64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Görsel okunamadı. Dosyayı tekrar seç."));
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.readAsDataURL(blob);
  });
}

function renderGallery(node, urls, title, onRemove) {
  node.replaceChildren();
  node.hidden = !urls.length;
  urls.forEach((url, index) => {
    const alt = title + " · Görsel " + (index + 1);
    const entry = element("div", "thumbnail");
    const button = element("button", "image-button");
    button.type = "button";
    button.setAttribute("aria-label", alt + " büyüt");
    const img = element("img");
    img.src = url;
    img.alt = alt;
    img.loading = "lazy";
    button.append(img);
    button.addEventListener("click", () => {
      const large = byId("large-image");
      large.src = url;
      large.alt = alt;
      byId("image-dialog").showModal();
    });
    entry.append(button);
    if (onRemove) {
      const remove = element("button", "icon-button remove", "×");
      remove.type = "button";
      remove.setAttribute("aria-label", alt + " kaldır");
      remove.addEventListener("click", () => onRemove(index));
      entry.append(remove);
    }
    node.append(entry);
  });
}

function webLink(value) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url : null;
  } catch {
    return null;
  }
}

composer.addEventListener("submit", (event) => {
  event.preventDefault();
  const error = byId("compose-error");
  message(error);
  if (pendingImages.size) {
    message(error, "Görseller hazırlanıyor. Birkaç saniye sonra tekrar dene.");
    return;
  }

  const data = new FormData(composer);
  const answers = questions.map((_, index) => data.get("answer" + index).trim());
  const live = webLink(data.get("live"));
  const repo = webLink(data.get("repo"));
  const incomplete = answers.findIndex((answer, index) => index < 2 && !answer && !uploads[index].length);

  if (incomplete !== -1) {
    message(error, questions[incomplete].title + " için bir fikir yaz veya görsel ekle.");
    composer.elements["answer" + incomplete].focus();
  } else if (!live) {
    message(error, "Canlı site için http:// veya https:// ile başlayan bir bağlantı gir.");
    composer.elements.live.focus();
  } else if (!repo || repo.hostname !== "github.com" || repo.pathname.split("/").filter(Boolean).length !== 2) {
    message(error, "Projenin GitHub deposuna doğrudan bağlantı gir.");
    composer.elements.repo.focus();
  } else if (!uploads[2].length) {
    message(error, "Film formu veya yönetici panelinden en az bir ekran görüntüsü ekle.");
    byId("questions").lastElementChild.querySelector(".upload").focus();
  } else {
    previewDraft = { answers, live: live.href, repo: repo.href, images: uploads.map((group) => group.map((image) => image.encoded)) };
    byId("preview-content").replaceChildren(postCard({
      ...previewDraft, name: profile.name, images: uploads.map((group) => group.map((image) => image.url)),
    }, true));
    message(byId("publish-error"));
    preview.showModal();
  }
});

byId("publish").addEventListener("click", async () => {
  publishing = true;
  const button = byId("publish");
  button.disabled = true;
  preview.querySelectorAll("[data-close]").forEach((control) => { control.disabled = true; });
  button.textContent = "Teslim ediliyor…";
  message(byId("publish-error"));
  try {
    const post = await request({}, previewDraft);
    preview.close();
    composer.reset();
    for (const group of uploads) {
      for (const image of group) URL.revokeObjectURL(image.url);
      group.length = 0;
    }
    showDelivery({ state: "mine", post });
    byId("posts").prepend(postCard(post));
    message(byId("feed-note"));
    byId("delivery-status").focus();
    await loadFeed();
  } catch (error) {
    if (error.status === 409) {
      preview.close();
      await loadFeed();
    } else {
      message(byId("publish-error"), error.message);
    }
  } finally {
    publishing = false;
    button.disabled = false;
    preview.querySelectorAll("[data-close]").forEach((control) => { control.disabled = false; });
    button.textContent = "Ödevi teslim et ↗";
  }
});

preview.addEventListener("cancel", (event) => {
  if (publishing) event.preventDefault();
});
for (const close of document.querySelectorAll("[data-close]")) {
  close.addEventListener("click", () => close.closest("dialog").close());
}

function postCard(post, isPreview = false) {
  const card = element("article", "card post");
  if (!isPreview) card.id = "gonderi-" + post.id;
  const header = element("header", "post-header");
  const avatar = element("span", "avatar", initials(post.name));
  avatar.setAttribute("aria-hidden", "true");
  const author = element("div");
  author.append(element("b", "", post.name));
  if (!isPreview) {
    const date = new Date(post.createdAt);
    const time = element("time", "", dateFormat.format(date));
    time.dateTime = date.toISOString();
    const dateLine = element("p");
    dateLine.append(time);
    author.append(dateLine);
  }
  header.append(avatar, author);
  card.append(header);

  questions.forEach((question, index) => {
    const section = element("section", "post-answer");
    section.append(element("h3", "", question.title));
    if (post.answers[index]) section.append(element("p", "", post.answers[index]));
    if (index === 2) {
      const links = element("div", "post-links");
      for (const [label, value] of [["Canlı site ↗", post.live], ["GitHub deposu ↗", post.repo]]) {
        const url = webLink(value);
        if (!url) continue;
        const link = element("a", "", label);
        link.href = url.href;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        links.append(link);
      }
      section.append(links);
    }
    const gallery = element("div", "gallery");
    const urls = isPreview ? post.images[index] : post.images[index].map((id) => urlFor({ image: id }).href);
    renderGallery(gallery, urls, question.title);
    section.append(gallery);
    card.append(section);
  });

  return card;
}

function showDelivery(delivery) {
  const status = byId("delivery-status");
  composer.hidden = Boolean(delivery);
  status.hidden = !delivery;
  const count = byId("delivery-count");
  message(count, delivery ? "1 / 1 teslim" : "0 / 1 teslim");
  if (!delivery) return;
  status.tabIndex = -1;
  const mine = delivery.state === "mine";
  status.replaceChildren(
    element("h3", "", mine ? "Ödevin teslim edildi." : "Bu ad veya tarayıcıyla bir teslim var."),
    element("p", "", mine ? "Gönderin sınıf akışında yayımlandı." : "Sınıf akışındaki gönderileri inceleyebilirsin."),
  );
  if (mine) {
    const link = element("a", "text-button", "Gönderimi gör ↓");
    link.href = "#gonderi-" + delivery.post.id;
    status.append(link);
  }
}

async function loadFeed(append = false) {
  if (!profile) return;
  const currentRequest = ++feedRequest;
  byId("refresh").disabled = true;
  byId("more").disabled = true;
  const profileAtRequest = profile;
  try {
    const result = await request(append ? { before: cursor } : {});
    if (currentRequest !== feedRequest || profileAtRequest !== profile) return;
    showDelivery(result.delivery);
    const container = byId("posts");
    if (!append) container.replaceChildren();
    if (result.delivery?.state === "mine" && !append &&
        !result.posts.some((post) => post.id === result.delivery.post.id)) {
      container.append(postCard(result.delivery.post));
    }
    for (const post of result.posts) {
      if (!byId("gonderi-" + post.id)) container.append(postCard(post));
    }
    message(byId("feed-note"), container.children.length ? "" : "Henüz gönderi yok. İlk ödevi sen paylaşabilirsin.");
    cursor = result.before;
    byId("more").hidden = !cursor;
  } catch (error) {
    if (currentRequest !== feedRequest || profileAtRequest !== profile) return;
    if (error.status === 401) {
      clearProfile();
      message(byId("profile-error"), "Devam etmek için adını ve soyadını yeniden yaz.");
    } else {
      message(byId("feed-note"), error.message + " Yenile düğmesiyle tekrar deneyebilirsin.");
    }
  } finally {
    if (currentRequest === feedRequest) {
      byId("refresh").disabled = false;
      byId("more").disabled = false;
    }
  }
}

byId("refresh").addEventListener("click", () => loadFeed());
byId("more").addEventListener("click", () => loadFeed(true));
showProfile();
