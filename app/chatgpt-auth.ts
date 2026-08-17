import { redirect } from "next/navigation";
import { getSessionUser } from "./session-auth";

export type ChatGPTUser = {
  displayName: string;
  email: string;
  fullName: string | null;
  role?: string;
};

const SIGN_IN_PATH = "/signin-with-chatgpt";
const SIGN_OUT_PATH = "/signout-with-chatgpt";
const CALLBACK_PATH = "/callback";

/**
 * Authentication for the public website must come from the application's
 * server-side session only.
 *
 * Never trust identity headers supplied by the incoming HTTP request here.
 * A browser/client can forge arbitrary request headers unless an upstream
 * component cryptographically authenticates them and the origin is otherwise
 * unreachable. The public Yuri Barbershop site is intentionally protected by
 * its own session cookie instead.
 */
export async function getChatGPTUser(): Promise<ChatGPTUser | null> {
  return getSessionUser();
}

export async function requireChatGPTUser(
  returnTo: string,
): Promise<ChatGPTUser> {
  const user = await getChatGPTUser();
  if (user) return user;

  redirect(chatGPTSignInPath(returnTo));
}

export function chatGPTSignInPath(returnTo: string): string {
  const safeReturnTo = safeRelativeReturnPath(returnTo);
  return `${SIGN_IN_PATH}?return_to=${encodeURIComponent(safeReturnTo)}`;
}

export function chatGPTSignOutPath(returnTo = "/"): string {
  void returnTo;
  return "/api/auth/logout";
}

function safeRelativeReturnPath(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) return "/";

  let url: URL;
  try {
    url = new URL(value, "https://app.local");
  } catch {
    return "/";
  }
  if (url.origin !== "https://app.local") return "/";
  if (isReservedAuthPath(url.pathname)) return "/";

  return `${url.pathname}${url.search}${url.hash}`;
}

function isReservedAuthPath(pathname: string): boolean {
  return (
    pathname === SIGN_IN_PATH ||
    pathname === SIGN_OUT_PATH ||
    pathname === CALLBACK_PATH
  );
}
