// Feature flags — flip a constant to toggle a whole subsystem on/off.

/**
 * Invite-only registration. When true, new sign-ups require a valid invite code
 * (admin generates codes at /admin) and the login page shows an invite field.
 * When false, registration is open and the entire invite-code subsystem — login
 * field, API check, admin page, and header link — is hidden.
 */
export const INVITE_ONLY_REGISTRATION = false;
