import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { dbConnect } from "@/lib/mongoose";
import { User } from "@/lib/models/User";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email or username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (creds) => {
        const id = String(creds?.email ?? "").trim();
        const password = String(creds?.password ?? "");
        if (!id || !password) return null;

        await dbConnect();
        // Accept either an email or a username.
        const user = await User.findOne({ $or: [{ email: id.toLowerCase() }, { username: id }] }).lean<{
          _id: unknown;
          username: string;
          email?: string;
          passwordHash: string;
          avatarUrl?: string;
          isAdmin?: boolean;
        }>();
        if (!user) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: String(user._id),
          name: user.username,
          email: user.email ?? null,
          image: user.avatarUrl ?? null,
          isAdmin: Boolean(user.isAdmin),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.uid = user.id;
        token.isAdmin = (user as { isAdmin?: boolean }).isAdmin ?? false;
      }
      // When the client calls update({ name }) after a rename, apply it immediately
      // (and fall back to the DB as source of truth).
      if (trigger === "update" && token.uid) {
        const passed = (session as { name?: string } | undefined)?.name;
        if (passed) {
          token.name = passed;
        } else {
          await dbConnect();
          const u = await User.findById(token.uid).lean<{ username: string }>();
          if (u) token.name = u.username;
        }
      }
      return token;
    },
    session({ session, token }) {
      if (token.uid && session.user) {
        const u = session.user as { id?: string; isAdmin?: boolean };
        u.id = token.uid as string;
        u.isAdmin = Boolean(token.isAdmin);
      }
      return session;
    },
  },
});
