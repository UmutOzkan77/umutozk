import { createHmac, timingSafeEqual } from "node:crypto";
import sharp from "sharp";

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const personName = /^[\p{L}\p{M}][\p{L}\p{M} .’'-]*$/u;
const imageEncoding = /^[A-Za-z0-9+/]+={0,2}$/;

export class RequestError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function cleanName(value) {
  return typeof value === "string" ? value.normalize("NFKC").trim().replace(/\s+/gu, " ") : "";
}

function sign(value) {
  return createHmac("sha256", process.env.YBST_SESSION_SECRET).update(value).digest();
}

export function profileFrom(body) {
  const first = cleanName(body?.first);
  const last = cleanName(body?.last);
  if (!personName.test(first) || !personName.test(last) || first.length > 60 || last.length > 60) {
    throw new RequestError(400, "Adını ve soyadını kontrol et.");
  }
  if (typeof body.browserId !== "string" || !UUID.test(body.browserId)) {
    throw new RequestError(400, "Tarayıcı profili oluşturulamadı. Sayfayı yenileyip tekrar dene.");
  }
  const name = first + " " + last;
  const payload = Buffer.from(JSON.stringify({ name, browserId: body.browserId })).toString("base64url");
  return { name, token: payload + "." + sign(payload).toString("base64url") };
}

export function verifyProfile(authorization) {
  const failure = new RequestError(401, "Adını ve soyadını yazarak devam et.");
  if (typeof authorization !== "string" || !authorization.startsWith("Bearer ") || authorization.length > 1500) {
    throw failure;
  }
  const [payload, signature, extra] = authorization.slice(7).split(".");
  if (!payload || !signature || extra !== undefined) throw failure;
  const expected = sign(payload);
  const provided = Buffer.from(signature, "base64url");
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) throw failure;
  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
}

export function nameKey(name) {
  return name.toLocaleLowerCase("tr").normalize("NFC");
}

function link(value) {
  if (typeof value !== "string" || value.length > 600) return null;
  try {
    const url = new URL(value.trim());
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url : null;
  } catch {
    return null;
  }
}

async function image(value) {
  if (typeof value !== "string" || value.length > 333_336 || !imageEncoding.test(value)) {
    throw new RequestError(400, "Görsellerden biri geçersiz veya çok büyük.");
  }
  const raw = Buffer.from(value, "base64");
  try {
    const input = sharp(raw, { limitInputPixels: 2_560_000 });
    const meta = await input.metadata();
    if (meta.format !== "webp" || meta.pages > 1 || meta.width > 1600 || meta.height > 1600 || raw.length > 250_000) {
      throw new Error("Invalid dimensions, format or file size");
    }
    return await input.webp({ quality: 86 }).toBuffer();
  } catch {
    throw new RequestError(400, "Görsellerden biri açılamadı. Dosyayı yeniden ekle.");
  }
}

export async function submissionFrom(body) {
  if (!Array.isArray(body?.answers) || body.answers.length !== 3 ||
      body.answers.some((answer) => typeof answer !== "string" || answer.length > 3500) ||
      !Array.isArray(body.images) || body.images.length !== 3 ||
      body.images.some((group) => !Array.isArray(group) || group.length > 3)) {
    throw new RequestError(400, "Gönderi alanlarını ve görsel sayısını kontrol et.");
  }

  const answers = body.answers.map((answer) => answer.trim());
  const live = link(body.live);
  const repo = link(body.repo);
  if (([0, 1]).some((index) => !answers[index] && !body.images[index].length)) {
    throw new RequestError(400, "İlk iki çalışma için metin veya görsel ekle.");
  }
  if (!live || !repo || repo.hostname !== "github.com" || repo.pathname.split("/").filter(Boolean).length !== 2) {
    throw new RequestError(400, "Canlı site ve GitHub depo bağlantılarını kontrol et.");
  }
  if (!body.images[2].length) {
    throw new RequestError(400, "Üçüncü çalışma için en az bir ekran görüntüsü ekle.");
  }
  const images = await Promise.all(body.images.map((group) => Promise.all(group.map(image))));
  return { answers, live: live.href, repo: repo.href, images };
}
