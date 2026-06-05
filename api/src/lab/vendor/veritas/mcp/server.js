import { createInterface } from "node:readline";
import { McpToolError, createVeritasMcpTools, } from "./tools.js";
import { ReceiptNotFoundError } from "../query/index.js";
function isObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}
function requestId(value) {
    if (!isObject(value))
        return null;
    const id = value.id;
    return typeof id === "string" || typeof id === "number" || id === null
        ? id
        : null;
}
function success(id, result) {
    return {
        jsonrpc: "2.0",
        id,
        result,
    };
}
function failure(id, code, message, data) {
    const error = {
        code,
        message,
    };
    if (data !== undefined) {
        error.data = data;
    }
    return {
        jsonrpc: "2.0",
        id,
        error,
    };
}
function toolContent(result) {
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify(result),
            },
        ],
        structuredContent: result,
    };
}
function isJsonRpcRequest(request) {
    return (isObject(request) &&
        request.jsonrpc === "2.0" &&
        typeof request.method === "string");
}
function leakGradientFailed(error) {
    return error instanceof Error && error.message.includes("Leak gradient violation");
}
export class VeritasMcpJsonRpcServer {
    tools;
    serverInfo;
    constructor(options) {
        this.tools = options.tools ?? createVeritasMcpTools(options);
        this.serverInfo = options.serverInfo ?? {
            name: "veritas",
            version: "0.1.0",
        };
    }
    async handleRequest(request) {
        if (!isJsonRpcRequest(request)) {
            return failure(requestId(request), -32600, "Invalid JSON-RPC request");
        }
        try {
            if (request.method === "initialize") {
                return success(request.id, {
                    protocolVersion: "2024-11-05",
                    capabilities: { tools: {} },
                    serverInfo: this.serverInfo,
                });
            }
            if (request.method === "tools/list") {
                return success(request.id, {
                    tools: this.tools.listToolDefinitions(),
                });
            }
            if (request.method === "tools/call") {
                if (!isObject(request.params)) {
                    return failure(request.id, -32602, "Invalid tool call parameters");
                }
                const name = request.params.name;
                if (typeof name !== "string") {
                    return failure(request.id, -32602, "Tool name must be a string");
                }
                const result = await this.tools.callTool(name, request.params.arguments ?? {});
                return success(request.id, toolContent(result));
            }
            if (request.method === "notifications/initialized") {
                return null;
            }
            return failure(request.id, -32601, `Method not found: ${request.method}`);
        }
        catch (error) {
            if (error instanceof McpToolError) {
                return failure(request.id, error.code, error.publicMessage);
            }
            if (error instanceof ReceiptNotFoundError) {
                return failure(request.id, -32004, "Receipt not found");
            }
            if (leakGradientFailed(error)) {
                return failure(request.id, -32001, "Output failed safety checks");
            }
            return failure(request.id, -32000, "Internal error");
        }
    }
}
export function createVeritasMcpJsonRpcServer(options) {
    return new VeritasMcpJsonRpcServer(options);
}
export function startStdioServer(options) {
    const input = options.input ?? process.stdin;
    const output = options.output ?? process.stdout;
    const server = options.server ?? createVeritasMcpJsonRpcServer(options);
    const lines = createInterface({ input, crlfDelay: Infinity });
    lines.on("line", async (line) => {
        if (line.trim().length === 0)
            return;
        let response;
        try {
            response = await server.handleRequest(JSON.parse(line));
        }
        catch (error) {
            const detail = error instanceof Error ? error.message : String(error);
            response = failure(null, -32700, "Parse error", detail);
        }
        if (response !== null) {
            output.write(`${JSON.stringify(response)}\n`);
        }
    });
    return server;
}
