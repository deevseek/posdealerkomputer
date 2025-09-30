import { useQuery } from "@tanstack/react-query";

interface AuthUser {
  id: string;
  firstName?: string | null;
  email?: string | null;
  role?: string | null;
}

export function useAuth() {
  const { data: user, isLoading } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
