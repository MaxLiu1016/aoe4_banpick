import { auth } from "@/auth";

export type CurrentUser = { id: string; name?: string | null; email?: string | null; isAdmin?: boolean };

/** Server-side: returns the logged-in user (with id) or null. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  const user = session?.user as CurrentUser | undefined;
  if (!user?.id) return null;
  return user;
}
