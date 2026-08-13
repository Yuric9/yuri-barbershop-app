const ADMIN_EMAILS = new Set([
  "yure-c@hotmail.com",
  "jesika.yure@gmail.com",
]);

export function isAdminEmail(email: string) {
  return ADMIN_EMAILS.has(email.trim().toLowerCase());
}
