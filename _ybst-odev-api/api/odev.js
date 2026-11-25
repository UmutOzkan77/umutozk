import { getFeed, getImage, publishPost } from "../lib/posts.js";
import { profileFrom, RequestError, submissionFrom, UUID, verifyProfile } from "../lib/validation.js";

const origins = new Set(["https://umutozk.com", "https://www.umutozk.com"]);
if (process.env.YBST_LOCAL === "1") {
  origins.add("http://localhost:4173");
  origins.add("http://127.0.0.1:4173");
}

function requestBody(req) {
  if (!(req.headers["content-type"] || "").startsWith("application/json")) {
    throw new RequestError(415, "Gönderi biçimi geçersiz.");
  }
  if (typeof req.body !== "string") return req.body;
  try {
    return JSON.parse(req.body);
  } catch {
    throw new RequestError(400, "Gönderi okunamadı.");
  }
}

export default async function handler(req, res) {
  const origin = req.headers.origin;
  if (origins.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  }
  res.setHeader("Vary", "Origin");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    return res.status(origins.has(origin) ? 204 : 403).end();
  }
  if (origin && !origins.has(origin)) {
    return res.status(403).json({ error: "Bu adresten işlem yapılamıyor." });
  }

  const params = new URL(req.url, "http://localhost").searchParams;
  try {
    if (req.method === "GET" && params.has("image")) {
      const id = params.get("image");
      const image = UUID.test(id) ? await getImage(id) : null;
      if (!image) throw new RequestError(404, "Görsel bulunamadı.");
      res.setHeader("Content-Type", "image/webp");
      res.setHeader("Cache-Control", "private, max-age=86400");
      return res.status(200).send(image);
    }
    if (req.method === "POST" && params.get("view") === "profile") {
      return res.status(200).json(profileFrom(requestBody(req)));
    }

    const profile = verifyProfile(req.headers.authorization);
    if (req.method === "GET") {
      const rawCursor = params.get("before");
      const before = rawCursor === null ? null : Number(rawCursor);
      if (before !== null && (!Number.isInteger(before) || before < 1 || before > 2_147_483_647)) {
        throw new RequestError(400, "Akış bağlantısı geçersiz.");
      }
      return res.status(200).json(await getFeed(profile, before));
    }
    if (req.method === "POST") {
      const submission = await submissionFrom(requestBody(req));
      const post = await publishPost(profile, submission);
      if (!post) throw new RequestError(409, "Bu ad veya tarayıcıyla daha önce ödev teslim edildi.");
      const { added, ...data } = post;
      return res.status(added ? 201 : 200).json(data);
    }
    res.setHeader("Allow", "GET, POST, OPTIONS");
    return res.status(405).json({ error: "Bu işlem desteklenmiyor." });
  } catch (error) {
    if (error instanceof RequestError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Assignment request failed", { name: error.name, code: error.code });
    return res.status(503).json({ error: "Teslim servisine şu an ulaşılamıyor. Birazdan tekrar dene." });
  }
}
