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

/**
 * The blocks JSON inside the text of a `.blocks` file. Files saved by the editor hold the Python,
 * a `## date` line and `##XRPBLOCKS {json}`; older files, and projects created but not edited yet,
 * hold only the JSON, with or without the marker. The Python and the date are never read: the
 * Python is always generated again from the blocks.
 */
export function extractBlocksJson(content: string): string {
    const parts = content.split('##XRPBLOCKS ');
    return parts.length > 1 ? parts[1] : parts[0];
}
