import { createAuthClient } from "better-auth/react";
import { usernameClient } from "better-auth/client/plugins";
import type { auth } from "./auth";

export const authClient = createAuthClient<typeof auth>({
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  plugins: [usernameClient()],
});

export const { useSession, signIn, signUp, signOut } = authClient;
