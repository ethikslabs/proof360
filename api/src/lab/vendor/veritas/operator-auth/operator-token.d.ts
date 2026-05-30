import type { OperatorScope, OperatorToken, TokenValidationResult } from "../types.js";
export declare function validateOperatorToken(token: OperatorToken, requiredScope: OperatorScope): TokenValidationResult;
export declare function createOperatorToken(caller_id: string, scope: OperatorScope[], durationMs?: number): OperatorToken;
