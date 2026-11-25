import { readFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);
const schema = await readFile(new URL("./schema.sql", import.meta.url), "utf8");
const statements = schema.split(";").map((statement) => statement.trim()).filter(Boolean);
await sql.transaction(statements.map((statement) => sql.query(statement)));
console.log("Ödev veritabanı hazır.");
