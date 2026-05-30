import type { VeritasQueryHandler } from "../query/index.js";
export interface ToolDefinition {
    name: string;
    description: string;
    inputSchema: {
        type: "object";
        required: string[];
        properties: Record<string, {
            type: "string";
            minLength: number;
        }>;
        additionalProperties: false;
    };
}
export interface HandlerLease {
    handler: VeritasQueryHandler;
    dispose?: () => void | Promise<void>;
}
export type HandlerFactory = () => HandlerLease | Promise<HandlerLease>;
export declare class McpToolError extends Error {
    code: number;
    publicMessage: string;
    constructor(code: number, publicMessage: string);
}
export declare class InvalidToolArgumentsError extends McpToolError {
    constructor(message: string);
}
export interface VeritasMcpToolsOptions {
    handler?: VeritasQueryHandler;
    handlerFactory?: HandlerFactory;
}
export declare class VeritasMcpTools {
    private options;
    constructor(options: VeritasMcpToolsOptions);
    listToolDefinitions(): ToolDefinition[];
    callTool(name: string, args?: unknown): Promise<unknown>;
    private withHandler;
}
export declare function createVeritasMcpTools(options: VeritasMcpToolsOptions): VeritasMcpTools;
