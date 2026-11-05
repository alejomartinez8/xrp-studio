import { githubBlockTheme } from '@/theme/github/blocks';
import type { BlockTheme } from '@/theme/types';

/**
 * Active theme. GitHub is the default and, for now, the only theme; a theme selector can later
 * pick another `BlockTheme` (and its app palette) here.
 */
export const activeBlockTheme: BlockTheme = githubBlockTheme;
