// Feature flags — flip a constant to toggle a whole subsystem on/off.

/**
 * Invite-only registration. When true, new sign-ups require a valid invite code
 * (admin generates codes at /admin) and the login page shows an invite field.
 * When false, registration is open and the entire invite-code subsystem — login
 * field, API check, admin page, and header link — is hidden.
 */
export const INVITE_ONLY_REGISTRATION = false;

/**
 * Playing without an account. When true, anyone can open a room from a PUBLIC
 * preset, take a seat and draft; their identity is a signed token in their own
 * browser rather than a row in the users collection. When false, every one of
 * those doors closes and the app is sign-in-only as before.
 *
 * Everything that accumulates — your own presets, favourites, your draft history,
 * account settings — stays behind registration either way. That line matters:
 * a guest token is an account with no password, so nothing private may sit behind it.
 */
export const GUEST_ACCESS = true;

/** How long a guest keeps their identity (and therefore their seat). Renewed on
 *  every connect, so an active player never hits it. */
export const GUEST_TOKEN_TTL_SEC = 30 * 24 * 60 * 60; // 30 days

/** Rooms a single IP may open per hour without an account. */
export const GUEST_MATCHES_PER_HOUR = 5;

/** Rooms one guest may leave sitting in the lobby before they must use them. */
export const GUEST_OPEN_LOBBIES = 3;
