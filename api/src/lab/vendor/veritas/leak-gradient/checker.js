export const FORBIDDEN_CUSTOMER_TERMS = [
    "CORPUS",
    "truth substrate",
    "VERITAS judges truth",
    "epistemological provenance layer",
    "three-tier corpus",
];
/**
 * Checks a string for forbidden customer-facing terms.
 * Case-insensitive matching. Returns all matches with positions.
 * Returns empty array if clean.
 */
export function checkForLeaks(input) {
    const matches = [];
    const lowerInput = input.toLowerCase();
    for (const term of FORBIDDEN_CUSTOMER_TERMS) {
        const lowerTerm = term.toLowerCase();
        let startIndex = 0;
        while (startIndex < lowerInput.length) {
            const pos = lowerInput.indexOf(lowerTerm, startIndex);
            if (pos === -1)
                break;
            matches.push({ term, position: pos });
            startIndex = pos + 1;
        }
    }
    return matches;
}
