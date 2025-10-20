import { promises as fs } from "fs";
import path from "path";

const ROOT_DIR = process.cwd();
const PUBLIC_DIR = path.join(ROOT_DIR, "public");
const LESSONS_DIR = path.join(PUBLIC_DIR, "lessons");
const OUTPUT_JS_PATH = path.join(PUBLIC_DIR, "lessons-data.js");
const OUTPUT_JSON_PATH = path.join(PUBLIC_DIR, "lessons.index.json");
const LESSON_FOLDER_PATTERN = /^(\d+)\.hafta$/i;
const RESERVED_FILE_NAMES = new Set(["lesson.meta.json"]);

function ensurePosix(relativePath) {
  return relativePath.split(path.sep).join("/");
}

function humanizeFileName(fileName) {
  const nameWithoutExtension = fileName.replace(/\.[^.]+$/, "");
  const cleaned = nameWithoutExtension.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return fileName;
  }
  return cleaned
    .split(" ")
    .map((word) => {
      if (!word.length) {
        return word;
      }
      return word[0].toLocaleUpperCase("tr-TR") + word.slice(1);
    })
    .join(" ");
}

function inferTypeFromExtension(fileName, fallback) {
  if (fallback) {
    return fallback;
  }
  const normalized = fileName.toLowerCase();
  if (normalized.endsWith(".pdf")) {
    return "pdf";
  }
  if (/\.(png|jpe?g|gif|webp|svg)$/.test(normalized)) {
    return "image";
  }
  if (/\.(mp4|webm|mov)$/.test(normalized)) {
    return "video";
  }
  if (/\.(mp3|wav|aac)$/.test(normalized)) {
    return "audio";
  }
  if (/\.(pptx?|key)$/.test(normalized)) {
    return "slides";
  }
  return "default";
}

async function readMetaFile(directoryPath) {
  const metaPath = path.join(directoryPath, "lesson.meta.json");
  try {
    const content = await fs.readFile(metaPath, "utf8");
    return JSON.parse(content);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.warn(`lesson.meta.json okunamadı (${directoryPath}):`, error);
    }
    return {};
  }
}

async function readDirectorySafely(targetPath) {
  try {
    return await fs.readdir(targetPath, { withFileTypes: true });
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.warn(`Klasör okunamadı: ${targetPath}`, error);
    }
    return [];
  }
}

async function walkFiles(baseDir, relativePrefix = "") {
  const absolutePath = relativePrefix ? path.join(baseDir, relativePrefix) : baseDir;
  const entries = await readDirectorySafely(absolutePath);
  const files = [];

  for (const entry of entries) {
    const relativePath = relativePrefix ? path.join(relativePrefix, entry.name) : entry.name;
    if (entry.isDirectory()) {
      const nestedFiles = await walkFiles(baseDir, relativePath);
      files.push(...nestedFiles);
    } else if (entry.isFile()) {
      files.push(relativePath);
    }
  }

  return files;
}

async function gatherResources(folderName, lessonFile, directoryPath, meta) {
  const resources = [];
  const declared = Array.isArray(meta.resources) ? meta.resources : [];
  const seen = new Set();
  const lessonPathLower = ensurePosix(lessonFile).toLowerCase();

  for (const resource of declared) {
    if (!resource) {
      continue;
    }

    if (resource.url) {
      resources.push({
        type: inferTypeFromExtension(resource.url, resource.type || "link"),
        title: resource.title || resource.label || resource.url,
        external: true,
        url: resource.url
      });
      continue;
    }

    const rawPath = resource.path || resource.file;
    if (!rawPath) {
      continue;
    }

    const normalisedPath = ensurePosix(rawPath);
    const absolutePath = path.join(directoryPath, normalisedPath);

    try {
      const stat = await fs.stat(absolutePath);
      if (!stat.isFile()) {
        continue;
      }
    } catch {
      console.warn(`Meta'da tanımlı dosya bulunamadı: ${path.join(folderName, normalisedPath)}`);
      continue;
    }

    const filename = path.basename(normalisedPath);
    const publicPath = ensurePosix(path.join("lessons", folderName, normalisedPath));
    seen.add(normalisedPath.toLowerCase());

    resources.push({
      type: inferTypeFromExtension(normalisedPath, resource.type),
      title: resource.title || resource.label || humanizeFileName(filename),
      filename,
      path: publicPath,
      file: normalisedPath,
      size: resource.size || null,
      external: false
    });
  }

  const allFiles = await walkFiles(directoryPath);

  for (const relativePath of allFiles) {
    const filename = path.basename(relativePath);
    const lowerPath = ensurePosix(relativePath).toLowerCase();

    if (RESERVED_FILE_NAMES.has(filename)) {
      continue;
    }
    if (lowerPath === lessonPathLower) {
      continue;
    }
    if (seen.has(lowerPath)) {
      continue;
    }

    const type = inferTypeFromExtension(filename);
    if (type === "default") {
      continue;
    }

    const publicPath = ensurePosix(path.join("lessons", folderName, relativePath));

    resources.push({
      type,
      title: humanizeFileName(filename),
      filename,
      path: publicPath,
      file: ensurePosix(relativePath),
      external: false
    });
  }

  return resources;
}

async function extractTitle(htmlPath, fallbackTitle) {
  try {
    const content = await fs.readFile(htmlPath, "utf8");
    const match = content.match(/<title>(.*?)<\/title>/i);
    if (match && match[1]) {
      return match[1].trim();
    }
  } catch (error) {
    console.warn(`Başlık okunamadı: ${htmlPath}`, error);
  }
  return fallbackTitle;
}

async function discoverLessons() {
  const lessonsDirExists = await fs
    .stat(LESSONS_DIR)
    .then((stat) => stat.isDirectory())
    .catch(() => false);

  if (!lessonsDirExists) {
    throw new Error(`lessons klasörü bulunamadı: ${LESSONS_DIR}`);
  }

  const entries = await fs.readdir(LESSONS_DIR, { withFileTypes: true });
  const lessons = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const match = entry.name.match(LESSON_FOLDER_PATTERN);
    if (!match) {
      continue;
    }

    const weekNumber = Number.parseInt(match[1], 10);
    if (Number.isNaN(weekNumber)) {
      continue;
    }

    const directoryPath = path.join(LESSONS_DIR, entry.name);
    const files = await readDirectorySafely(directoryPath);
    const htmlFiles = files.filter((file) => file.isFile() && file.name.toLowerCase().endsWith(".html")).map((file) => file.name);

    let lessonFile = "lesson.html";
    if (htmlFiles.length === 0) {
      console.warn(`HTML dosyası bulunamadı: ${entry.name}`);
      continue;
    }
    if (!htmlFiles.includes(lessonFile)) {
      lessonFile = htmlFiles[0];
    }

    const meta = await readMetaFile(directoryPath);
    if (meta.lessonFile) {
      lessonFile = meta.lessonFile;
    }

    const htmlPath = path.join(directoryPath, lessonFile);
    const titleFallback = meta.title || humanizeFileName(lessonFile);
    const title = await extractTitle(htmlPath, titleFallback);

    const lessonPublicPath = ensurePosix(path.join("lessons", entry.name, lessonFile));
    const resources = await gatherResources(entry.name, lessonFile, directoryPath, meta);

    lessons.push({
      id: meta.id || `ders-${String(weekNumber).padStart(2, "0")}`,
      week: weekNumber,
      folder: entry.name,
      title,
      description: meta.description || "",
      date: meta.date || null,
      tags: Array.isArray(meta.tags) ? meta.tags : [],
      lessonPath: lessonPublicPath,
      resources,
      searchBoost: meta.searchBoost || 1,
      lastUpdated: meta.lastUpdated || null
    });
  }

  lessons.sort((a, b) => a.week - b.week);
  return lessons;
}

async function writeOutputs(lessons) {
  const lessonsIndex = {
    generatedAt: new Date().toISOString(),
    lessons
  };

  await fs.mkdir(PUBLIC_DIR, { recursive: true });
  await fs.writeFile(OUTPUT_JSON_PATH, JSON.stringify(lessonsIndex, null, 2), "utf8");

  const banner = "// Bu dosya scripts/generate-lessons.mjs tarafından otomatik üretilmiştir.\n";
  const payload = `window.LESSON_DIRECTORY = ${JSON.stringify(lessons, null, 2)};\n`;
  await fs.writeFile(OUTPUT_JS_PATH, banner + payload, "utf8");
}

async function main() {
  const lessons = await discoverLessons();
  await writeOutputs(lessons);
  console.log(`Toplam ${lessons.length} ders işlendi.`);
}

main().catch((error) => {
  console.error("Ders verileri oluşturulurken hata oluştu:", error);
  process.exit(1);
});
