export class McpToolError extends Error {
    code;
    publicMessage;
    constructor(code, publicMessage) {
        super(publicMessage);
        this.code = code;
        this.publicMessage = publicMessage;
        this.name = "McpToolError";
    }
}
export class InvalidToolArgumentsError extends McpToolError {
    constructor(message) {
        super(-32602, message);
        this.name = "InvalidToolArgumentsError";
    }
}
const TOOL_DEFINITIONS = [
    {
        name: "veritas.claim.status",
        description: "Return the latest customer-safe verification for a claim.",
        inputSchema: {
            type: "object",
            required: ["claim_ref"],
            properties: {
                claim_ref: { type: "string", minLength: 1 },
            },
            additionalProperties: false,
        },
    },
    {
        name: "veritas.receipt.verify",
        description: "Verify a receipt and return customer-safe verification.",
        inputSchema: {
            type: "object",
            required: ["receipt_id"],
            properties: {
                receipt_id: { type: "string", minLength: 1 },
            },
            additionalProperties: false,
        },
    },
    {
        name: "veritas.source.downgrades",
        description: "List downgrade events for receipts referencing a source.",
        inputSchema: {
            type: "object",
            required: ["source_id"],
            properties: {
                source_id: { type: "string", minLength: 1 },
            },
            additionalProperties: false,
        },
    },
];
function clone(value) {
    return JSON.parse(JSON.stringify(value));
}
function isObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}
function requireTrimmedString(args, key) {
    const value = args[key];
    if (typeof value !== "string") {
        throw new InvalidToolArgumentsError(`${key} must be a string`);
    }
    const trimmed = value.trim();
    if (trimmed.length === 0) {
        throw new InvalidToolArgumentsError(`${key} must not be empty`);
    }
    return trimmed;
}
export class VeritasMcpTools {
    options;
    constructor(options) {
        this.options = options;
        if (!options.handler && !options.handlerFactory) {
            throw new Error("VeritasMcpTools requires a handler or handlerFactory");
        }
    }
    listToolDefinitions() {
        return clone(TOOL_DEFINITIONS);
    }
    async callTool(name, args = {}) {
        if (!isObject(args)) {
            throw new InvalidToolArgumentsError("Tool arguments must be an object");
        }
        return this.withHandler(async (handler) => {
            if (name === "veritas.claim.status") {
                return handler.handleClaimStatus(requireTrimmedString(args, "claim_ref"));
            }
            if (name === "veritas.receipt.verify") {
                return handler.handleVerifyReceipt(requireTrimmedString(args, "receipt_id"));
            }
            if (name === "veritas.source.downgrades") {
                return handler.handleListDowngrades(requireTrimmedString(args, "source_id"));
            }
            throw new InvalidToolArgumentsError(`Unknown VERITAS MCP tool: ${name}`);
        });
    }
    async withHandler(callback) {
        if (this.options.handler) {
            return callback(this.options.handler);
        }
        const lease = await this.options.handlerFactory();
        try {
            return await callback(lease.handler);
        }
        finally {
            await lease.dispose?.();
        }
    }
}
export function createVeritasMcpTools(options) {
    return new VeritasMcpTools(options);
}
