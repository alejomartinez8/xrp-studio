/**
 * Read the blocks JSON saved in a `.blocks` file. A file that was created but never saved is
 * empty, so blank text means "no blocks" (undefined) instead of a JSON parse error.
 */
export function parseBlocksJson(text: string | undefined | null): object | undefined {
    if (!text || text.trim() === '') {
        return undefined;
    }
    return JSON.parse(text) as object;
}
