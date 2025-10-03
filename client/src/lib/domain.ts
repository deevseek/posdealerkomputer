import { isPrimaryDomainOrLocal } from '@shared/constants/domains';

export function isPrimaryDomainClient(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return isPrimaryDomainOrLocal(window.location.hostname);
}
