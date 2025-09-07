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
  // Show setup if not completed OR if there's an error (assume fresh installation)
  const needsSetup = (!isSetupCompleted && !isSetupLoading) || (!setupStatus && !isSetupLoading);

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