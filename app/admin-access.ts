/**
 * Administrative access must be granted by the authenticated account role,
 * never by matching an e-mail address supplied by the request.
 *
 * Kept temporarily for compatibility with existing imports. All callers now
 * receive false and therefore must rely on user.role === "admin".
 */
export function isAdminEmail(_email: string) {
  return false;
}
