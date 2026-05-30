import type { Readable, Writable } from "node:stream";
import { type VeritasMcpTools, type VeritasMcpToolsOptions } from "./tools.js";
interface ServerInfo {
    name: string;
    version: string;
}
export interface VeritasMcpJsonRpcServerOptions extends VeritasMcpToolsOptions {
    tools?: VeritasMcpTools;
    serverInfo?: ServerInfo;
}
export declare class VeritasMcpJsonRpcServer {
    private tools;
    private serverInfo;
    constructor(options: VeritasMcpJsonRpcServerOptions);
    handleRequest(request: unknown): Promise<unknown | null>;
}
export declare function createVeritasMcpJsonRpcServer(options: VeritasMcpJsonRpcServerOptions): VeritasMcpJsonRpcServer;
export interface StdioServerOptions extends VeritasMcpJsonRpcServerOptions {
    input?: Readable;
    output?: Writable;
    server?: VeritasMcpJsonRpcServer;
}
export declare function startStdioServer(options: StdioServerOptions): VeritasMcpJsonRpcServer;
export {};
