/* eslint-disable @typescript-eslint/no-explicit-any */
import { useSession } from "next-auth/react";

/**
 * Hook untuk mengakses NextAuth session dan sync dengan Redux store
 */
export const useNextAuthSession = () => {
  const { data: session, status } = useSession();

  return {
    session,
    status,
    isLoading: status === "loading",
    isAuthenticated: status === "authenticated",
    user: (session as any)?.user || null,
    accessToken: (session as any)?.access_token || null,
  };
};
