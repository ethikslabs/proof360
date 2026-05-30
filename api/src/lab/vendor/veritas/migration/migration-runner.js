import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { validateOperatorToken } from "../operator-auth/index.js";
export class MigrationRunner {
    connection;
    migrationsDir;
    constructor(connection, migrationsDir) {
        this.connection = connection;
        this.migrationsDir = migrationsDir;
    }
    async ensureMigrationsTable() {
        await this.connection.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`);
    }
    async listPending() {
        await this.ensureMigrationsTable();
        const filenames = (await readdir(this.migrationsDir))
            .filter((name) => name.endsWith(".sql"))
            .sort();
        const applied = await this.connection.query("SELECT filename FROM schema_migrations");
        const appliedSet = new Set(applied.rows.map((row) => row.filename));
        return filenames.filter((filename) => !appliedSet.has(filename));
    }
    async execute(token) {
        this.assertMigrateToken(token);
        const pending = await this.listPending();
        const applied = [];
        for (const filename of pending) {
            const sql = await readFile(join(this.migrationsDir, filename), "utf8");
            await this.connection.query("BEGIN");
            try {
                await this.connection.query(sql);
                await this.connection.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [filename]);
                await this.connection.query("COMMIT");
                applied.push(filename);
            }
            catch (error) {
                await this.connection.query("ROLLBACK");
                const detail = error instanceof Error ? error.message : String(error);
                throw new Error(`Migration failed (${filename}): ${detail}`);
            }
        }
        return { applied, pending: [] };
    }
    async dryRun(token) {
        this.assertMigrateToken(token);
        const pending = await this.listPending();
        const sqlPreview = await Promise.all(pending.map((filename) => readFile(join(this.migrationsDir, filename), "utf8")));
        return { applied: [], pending, sql_preview: sqlPreview };
    }
    assertMigrateToken(token) {
        const validation = validateOperatorToken(token, "migrate");
        if (!validation.valid) {
            throw new Error(validation.error);
        }
    }
}
