import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { FinanceDateRange, FinanceSummary, FinancialRecord, JournalEntry } from "@/types/finance";

const formatDateParam = (date: string) => date;

export function useFinanceSummary({ startDate, endDate }: FinanceDateRange) {
  return useQuery<FinanceSummary>({
    queryKey: ["/api/finance/summary", startDate, endDate],
    queryFn: () =>
      apiRequest(
        "GET",
        `/api/finance/summary?startDate=${encodeURIComponent(formatDateParam(startDate))}&endDate=${encodeURIComponent(formatDateParam(endDate))}`,
      ),
  });
}

export function useFinanceTransactions({ startDate, endDate }: FinanceDateRange) {
  return useQuery<FinancialRecord[]>({
    queryKey: ["/api/finance/transactions", startDate, endDate],
    queryFn: () =>
      apiRequest(
        "GET",
        `/api/finance/transactions?startDate=${encodeURIComponent(formatDateParam(startDate))}&endDate=${encodeURIComponent(formatDateParam(endDate))}`,
      ),
  });
}

export function useJournalEntry(id?: string | null) {
  const enabled = useMemo(() => Boolean(id), [id]);

  return useQuery<JournalEntry | null>({
    queryKey: ["/api/finance/journal", id],
    enabled,
    queryFn: () => apiRequest("GET", `/api/finance/journal/${id}`),
  });
}
