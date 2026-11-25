CREATE TABLE IF NOT EXISTS assignment_posts (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  name text NOT NULL,
  name_key text NOT NULL UNIQUE,
  browser_id uuid NOT NULL UNIQUE,
  answers text[] NOT NULL CHECK (cardinality(answers) = 3),
  live text NOT NULL,
  repo text NOT NULL
);

CREATE TABLE IF NOT EXISTS assignment_images (
  id uuid PRIMARY KEY,
  post_id integer NOT NULL REFERENCES assignment_posts(id) ON DELETE CASCADE,
  question smallint NOT NULL CHECK (question BETWEEN 0 AND 2),
  position smallint NOT NULL CHECK (position BETWEEN 0 AND 2),
  data bytea NOT NULL,
  UNIQUE (post_id, question, position)
);
