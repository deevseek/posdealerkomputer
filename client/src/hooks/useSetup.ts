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
  });

  const isSetupCompleted = setupStatus?.setupCompleted ?? false;
  const needsSetup = !isSetupCompleted && !isSetupLoading && !error;

  return {
    setupStatus,
    isSetupLoading,
    isSetupCompleted,
    needsSetup,
  };
}