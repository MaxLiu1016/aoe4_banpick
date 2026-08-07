/**
 * Presets per page.
 *
 * Twelve rather than nine: the grid is two across, so nine left a row half empty,
 * and the ten demo formats now pinned to the front of the list did not fit on the
 * first page at all — the EGC set filled it and pushed everything else to page
 * two. Shared, because the server renders the first page and the browser fetches
 * every page after it, and a mismatch makes the list jump on first paint.
 *
 * Its own module, with no imports: the browser reads it too, and `publicPreset`
 * pulls in mongoose.
 */
export const PRESET_PAGE_SIZE = 12;
