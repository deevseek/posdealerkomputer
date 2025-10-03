import { useQuery } from '@tanstack/react-query';

interface SetupStatus {
  setupCompleted: boolean;
  hasStoreConfig: boolean;
  hasAdminUser: boolean;
  storeName?: string;
  setupSteps: {
    store?: boolean;
    admin?: boolean;
    completed?: boolean;
  };
}

export function useSetup() {
  const { data: setupStatus, isLoading: isSetupLoading, error } = useQuery<SetupStatus>({
    queryKey: ['/api/setup/status'],
    refetchInterval: false,
    staleTime: Infinity, // Don't refetch unless manually invalidated
    retry: 3, // Retry failed requests
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });

  const isSetupCompleted = setupStatus?.setupCompleted ?? false;

  // Only show the setup wizard when the API explicitly tells us setup isn't complete.
  // When the status request fails (e.g. server offline), fall back to regular auth flow
  // so the app doesn't get stuck on a blank setup screen.
  const needsSetup =
    !isSetupLoading && setupStatus ? !isSetupCompleted : false;

  // Debug logging for development
  if (process.env.NODE_ENV === 'development') {
    console.log('Setup Status Debug:', {
      setupStatus,
      isSetupLoading,
      isSetupCompleted,
      needsSetup,
      error: error?.message
    });
  }

  return {
    setupStatus,
    isSetupLoading,
    isSetupCompleted,
    needsSetup,
    error,
  };
}