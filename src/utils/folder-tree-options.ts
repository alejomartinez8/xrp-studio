/**
 * Folder tree behaviour in XRP Studio.
 *
 * XRPWeb opens a file with a double click and selects it with a single click. On tablets and
 * phones a double tap usually zooms the page instead, so the file never opens, and children
 * expect a single tap to open things. With this flag a single click or tap opens the file (or
 * switches to its tab when it is already open); folders still open and close with one click.
 */
export const openFilesOnSingleClick = true;
