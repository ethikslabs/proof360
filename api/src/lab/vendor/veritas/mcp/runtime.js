import { pathToFileURL } from "node:url";
import { Pool } from "pg";
import { VeritasReceiptQueryHandler } from "../query/index.js";
import { PersistentReceiptStore } from "../store/index.js";
import { startStdioServer } from "./server.js";
import { createVeritasMcpTools } from "./tools.js";
function databaseUrl(env) {
    const url = env.VERITAS_DATABASE_URL ?? env.DATABASE_URL;
    if (!url) {
        throw new Error("VERITAS_DATABASE_URL or DATABASE_URL is required");
    }
    return url;
}
export function startRuntime(options = {}) {
    const env = options.env ?? process.env;
    const pool = new Pool({ connectionString: databaseUrl(env) });
    const tools = createVeritasMcpTools({
        handlerFactory: async () => {
            const client = await pool.connect();
            return {
                handler: new VeritasReceiptQueryHandler(new PersistentReceiptStore(client)),
                dispose: () => client.release(),
            };
        },
    });
    startStdioServer({ tools });
    const close = async () => {
        await pool.end();
    };
    process.once("SIGINT", () => {
        void close().finally(() => process.exit(0));
    });
    process.once("SIGTERM", () => {
        void close().finally(() => process.exit(0));
    });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    try {
        startRuntime();
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(message);
        process.exitCode = 1;
    }
}
