import { vscodeBlockTheme } from '@/theme/vscode/blocks';
import type { BlockTheme } from '@/theme/types';

/**
 * Active theme: the VS Code default themes, Default Light+ and Default Dark+. A theme selector can
 * later pick another `BlockTheme` (and its app palette) here.
 */
export const activeBlockTheme: BlockTheme = vscodeBlockTheme;
