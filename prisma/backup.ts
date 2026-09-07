import { copyFileSync, existsSync, mkdirSync } from "fs";
import { basename, isAbsolute, join, resolve } from "path";
import { fileURLToPath } from "url";

/**
 * A copy of the guest list before a script rewrites it.
 *
 * `npm run seed` is run against the real database more than once — the guest
 * list grows, a household splits — and by then those rows carry replies that
 * cannot be typed back in. So every run leaves a timestamped copy behind first.
 *
 * Backups live next to the database in `prisma/backups/` and are ignored by
 * git, which is deliberate: they hold guests' names and answers.
 *
 * This is for a script run by hand. The deploy takes its own copy, before it
 * has touched anything and with `sqlite3 .backup`, which is the only safe way
 * to read a live SQLite file — a plain copy of a database mid-write can catch
 * it between the WAL and the main file. It also prunes what it keeps. So the
 * deploy sets `SKIP_DB_BACKUP=1` rather than collecting a second, worse copy
 * from every script it runs.
 */

/** Where `prisma/schema.prisma` lives — relative URLs are resolved from here. */
const PRISMA_DIR = resolve(process.cwd(), "prisma");

/**
 * The file behind `DATABASE_URL`, or `null` if it is not a SQLite file at all.
 *
 * Prisma resolves a relative `file:` URL against the schema's directory, not
 * against the working directory, so `file:./dev.db` means `prisma/dev.db` no
 * matter where `npm run seed` was typed.
 */
export function databaseFile(url = process.env.DATABASE_URL): string | null {
  if (!url) return null;
  if (!url.startsWith("file:")) return null;

  // `file:/absolute/path` and `file:./relative` are both spelled with one
  // scheme but parse differently; `file:///...` is a real URL.
  if (url.startsWith("file://")) {
    try {
      return fileURLToPath(url);
    } catch {
      return null;
    }
  }

  const path = url.slice("file:".length);
  if (!path) return null;
  return isAbsolute(path) ? path : resolve(PRISMA_DIR, path);
}

/**
 * Copies the database aside and returns the path written, or `null` when there
 * was nothing to copy.
 *
 * A missing database is not a failure: the first seed of a fresh checkout has
 * nothing to lose, and refusing to run would be the more annoying answer.
 *
 * `SKIP_DB_BACKUP=1` turns it off, for the one caller that has already taken a
 * better copy — see the note on that constant.
 */
export function createBackup(): string | null {
  if (process.env.SKIP_DB_BACKUP === "1") {
    console.log("SKIP_DB_BACKUP=1 — assuming the caller has already taken one.");
    return null;
  }

  const dbPath = databaseFile();
  if (!dbPath) {
    console.warn("No SQLite DATABASE_URL — skipping backup.");
    return null;
  }
  if (!existsSync(dbPath)) {
    console.warn(`No database at ${dbPath} yet — skipping backup.`);
    return null;
  }

  const backupDir = join(PRISMA_DIR, "backups");
  mkdirSync(backupDir, { recursive: true });

  // `:` is legal in a filename on Unix and not on Windows, and it reads badly
  // either way, so the ISO stamp is flattened to dashes.
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").replace(/Z$/, "");
  const backupPath = join(backupDir, `${basename(dbPath)}.${stamp}.backup`);

  copyFileSync(dbPath, backupPath);
  console.log(`✓ Database backed up to ${backupPath}`);

  return backupPath;
}
