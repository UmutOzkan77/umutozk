import { randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { nameKey } from "./validation.js";

const pageSize = 12;

function sql() {
  return neon(process.env.DATABASE_URL);
}

function postFrom(row) {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    answers: row.answers,
    live: row.live,
    repo: row.repo,
    images: [0, 1, 2].map((index) => row.images.filter((image) => image.question === index).map((image) => image.id)),
  };
}

export async function getFeed(profile, before) {
  const db = sql();
  const [posts, matches] = await db.transaction([
    db`
      SELECT p.id, p.name, p.created_at, p.answers, p.live, p.repo,
        COALESCE((
          SELECT jsonb_agg(jsonb_build_object('id', i.id, 'question', i.question) ORDER BY i.question, i.position)
          FROM assignment_images i WHERE i.post_id = p.id
        ), '[]'::jsonb) AS images
      FROM assignment_posts p
      WHERE (${before}::integer IS NULL OR p.id < ${before})
      ORDER BY p.id DESC LIMIT ${pageSize + 1}
    `,
    db`
      SELECT p.id, p.name, p.created_at, p.answers, p.live, p.repo,
        COALESCE((
          SELECT jsonb_agg(jsonb_build_object('id', i.id, 'question', i.question) ORDER BY i.question, i.position)
          FROM assignment_images i WHERE i.post_id = p.id
        ), '[]'::jsonb) AS images,
        p.browser_id = ${profile.browserId}::uuid AND p.name_key = ${nameKey(profile.name)} AS mine
      FROM assignment_posts p
      WHERE p.browser_id = ${profile.browserId}::uuid OR p.name_key = ${nameKey(profile.name)}
      ORDER BY mine DESC LIMIT 1
    `,
  ]);
  const match = matches[0];
  return {
    posts: posts.slice(0, pageSize).map(postFrom),
    before: posts.length > pageSize ? posts[pageSize - 1].id : null,
    delivery: match ? (match.mine ? { state: "mine", post: postFrom(match) } : { state: "taken" }) : null,
  };
}

export async function publishPost(profile, submission) {
  const db = sql();
  const normalizedName = nameKey(profile.name);
  const files = submission.images.flatMap((group, question) => group.map((file, position) => ({
    id: randomUUID(), question, position, data: file.toString("base64"),
  })));

  const [row] = await db`
    WITH submitted AS (
      INSERT INTO assignment_posts (name, name_key, browser_id, answers, live, repo)
      VALUES (${profile.name}, ${normalizedName}, ${profile.browserId}::uuid,
              ${submission.answers}::text[], ${submission.live}, ${submission.repo})
      ON CONFLICT DO NOTHING
      RETURNING id, name, created_at, answers, live, repo
    ), attached AS (
      INSERT INTO assignment_images (id, post_id, question, position, data)
      SELECT f.id, s.id, f.question, f.position, decode(f.data, 'base64')
      FROM submitted s
      CROSS JOIN jsonb_to_recordset(${JSON.stringify(files)}::jsonb)
        AS f(id uuid, question smallint, position smallint, data text)
      RETURNING post_id
    )
    SELECT * FROM submitted
  `;

  if (row) return { ...postFrom({ ...row, images: files }), added: true };

  // A user can retry a request that completed after the connection was lost.
  const { delivery } = await getFeed(profile, null);
  return delivery?.state === "mine" ? delivery.post : null;
}

export async function getImage(id) {
  const db = sql();
  const [row] = await db`SELECT encode(data, 'base64') AS data FROM assignment_images WHERE id = ${id}::uuid`;
  return row ? Buffer.from(row.data, "base64") : null;
}
