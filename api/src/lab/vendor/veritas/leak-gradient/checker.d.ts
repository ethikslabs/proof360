export declare const FORBIDDEN_CUSTOMER_TERMS: readonly string[];
export interface LeakMatch {
    term: string;
    position: number;
}
/**
 * Checks a string for forbidden customer-facing terms.
 * Case-insensitive matching. Returns all matches with positions.
 * Returns empty array if clean.
 */
export declare function checkForLeaks(input: string): LeakMatch[];
