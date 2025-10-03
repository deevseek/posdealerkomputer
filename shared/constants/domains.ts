export const PRIMARY_DOMAIN = 'profesionalservis.my.id';
export const PRIMARY_DOMAINS: readonly string[] = [PRIMARY_DOMAIN];

const LOCAL_HOSTS = ['localhost', '127.0.0.1'] as const;

export function normalizeHostname(hostname?: string | null): string {
  if (!hostname) return '';
  const host = hostname.trim().toLowerCase();
  if (!host) return '';
  const withoutPort = host.split(':')[0] ?? '';
  return withoutPort.startsWith('www.') ? withoutPort.slice(4) : withoutPort;
}

export function isLocalHost(hostname?: string | null): boolean {
  const normalized = normalizeHostname(hostname);
  return normalized ? (LOCAL_HOSTS as readonly string[]).includes(normalized) : false;
}

export function isPrimaryDomainHost(hostname?: string | null): boolean {
  const normalized = normalizeHostname(hostname);
  if (!normalized) return false;
  return PRIMARY_DOMAINS.includes(normalized);
}

export function isPrimaryDomainOrLocal(hostname?: string | null): boolean {
  return isPrimaryDomainHost(hostname) || isLocalHost(hostname);
}
