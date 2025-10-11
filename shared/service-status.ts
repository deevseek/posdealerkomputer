export const SERVICE_STATUS_VALUES = [
  'pending',
  'checking',
  'in-progress',
  'waiting-confirmation',
  'waiting-parts',
  'completed',
  'delivered',
  'cancelled',
] as const;

export type ServiceStatus = typeof SERVICE_STATUS_VALUES[number];

export type LegacyServiceStatus =
  | 'sedang_dicek'
  | 'menunggu_konfirmasi'
  | 'menunggu_sparepart'
  | 'sedang_dikerjakan'
  | 'selesai'
  | 'sudah_diambil'
  | 'cencel';

export const LEGACY_STATUS_MAP: Record<LegacyServiceStatus, ServiceStatus> = {
  sedang_dicek: 'pending',
  menunggu_konfirmasi: 'waiting-confirmation',
  menunggu_sparepart: 'waiting-parts',
  sedang_dikerjakan: 'in-progress',
  selesai: 'completed',
  sudah_diambil: 'delivered',
  cencel: 'cancelled',
};

const STATUS_SET = new Set<string>(SERVICE_STATUS_VALUES);

export const SERVICE_STATUS_LABELS: Record<ServiceStatus, string> = {
  pending: 'Sedang Dicek',
  checking: 'Sedang Dicek',
  'in-progress': 'Sedang Dikerjakan',
  'waiting-confirmation': 'Menunggu Konfirmasi',
  'waiting-parts': 'Menunggu Sparepart',
  completed: 'Selesai',
  delivered: 'Sudah Diambil',
  cancelled: 'Dibatalkan',
};

export const FINAL_SERVICE_STATUSES: ServiceStatus[] = ['completed', 'delivered', 'cancelled'];

export function normalizeServiceStatus(value: string | null | undefined): ServiceStatus | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-');

  if (STATUS_SET.has(normalized)) {
    return normalized as ServiceStatus;
  }

  if (normalized in LEGACY_STATUS_MAP) {
    return LEGACY_STATUS_MAP[normalized as LegacyServiceStatus];
  }

  return undefined;
}

export function coerceServiceStatus(value: string | null | undefined, fallback: ServiceStatus = 'pending'): ServiceStatus {
  return normalizeServiceStatus(value) ?? fallback;
}

export function isFinalServiceStatus(value: string | null | undefined): boolean {
  const status = normalizeServiceStatus(value);
  return status ? FINAL_SERVICE_STATUSES.includes(status) : false;
}

export function getServiceStatusLabel(value: string | null | undefined, fallback = 'Status Tidak Diketahui'): string {
  const status = normalizeServiceStatus(value);
  return status ? SERVICE_STATUS_LABELS[status] : fallback;
}

export function mapLegacyStatusToCurrent(status: LegacyServiceStatus): ServiceStatus {
  return LEGACY_STATUS_MAP[status];
}

export function maybeMapLegacyStatus(value: string | null | undefined): ServiceStatus | undefined {
  const status = normalizeServiceStatus(value);
  return status;
}
