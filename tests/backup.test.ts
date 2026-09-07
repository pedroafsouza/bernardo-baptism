import { strict as assert } from "node:assert";
import { test } from "node:test";
import { isAbsolute, join } from "node:path";

import { createBackup, databaseFile } from "../prisma/backup";

const PRISMA_DIR = join(process.cwd(), "prisma");

test("a relative file: url is resolved the way Prisma resolves it", () => {
  // Prisma resolves it against the schema's directory, not the shell's — and
  // `npm run seed` is typed at the repository root, so anything else looks for
  // a database that is not there and backs up nothing.
  assert.equal(databaseFile("file:./dev.db"), join(PRISMA_DIR, "dev.db"));
  assert.equal(databaseFile("file:dev.db"), join(PRISMA_DIR, "dev.db"));
  assert.equal(databaseFile("file:../data/prod.db"), join(process.cwd(), "data", "prod.db"));
});

test("an absolute database keeps its own path", () => {
  const path = databaseFile("file:/srv/baptism/prod.db");
  assert.ok(path && isAbsolute(path));
  assert.equal(path, "/srv/baptism/prod.db");
});

test("a file:// url is read as a url", () => {
  assert.equal(databaseFile("file:///srv/baptism/prod.db"), "/srv/baptism/prod.db");
});

test("anything that is not a sqlite file has nothing to back up", () => {
  assert.equal(databaseFile(undefined), null);
  assert.equal(databaseFile(""), null);
  assert.equal(databaseFile("file:"), null);
  assert.equal(databaseFile("postgresql://localhost/baptism"), null);
});

test("SKIP_DB_BACKUP=1 takes no copy", () => {
  // The deploy has already taken one, before it touched anything and with
  // sqlite3 rather than cp. Two or three more from the scripts it then runs
  // would be later, less safe and unpruned.
  const before = process.env.SKIP_DB_BACKUP;
  process.env.SKIP_DB_BACKUP = "1";
  try {
    assert.equal(createBackup(), null);
  } finally {
    if (before === undefined) delete process.env.SKIP_DB_BACKUP;
    else process.env.SKIP_DB_BACKUP = before;
  }
});

test("nothing to copy is not an error", () => {
  // A first seed, against a checkout with no database yet, has nothing to lose.
  const before = process.env.DATABASE_URL;
  process.env.DATABASE_URL = "file:./no-such-database.db";
  try {
    assert.equal(createBackup(), null);
  } finally {
    if (before === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = before;
  }
});
