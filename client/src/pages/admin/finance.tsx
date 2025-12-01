import { useMemo, useState } from "react";
import { DateFilter } from "@/components/finance/DateFilter";
import { FinanceSummaryCards } from "@/components/finance/FinanceSummaryCards";
import { FinanceCharts } from "@/components/finance/FinanceCharts";
import { FinanceTable } from "@/components/finance/FinanceTable";
import { JournalModal } from "@/components/finance/JournalModal";
import { useFinanceSummary, useFinanceTransactions, useJournalEntry } from "@/hooks/useFinance";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CalendarRange, ClipboardList, Wallet } from "lucide-react";

const currency = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
});

function startOfMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, "0")}-01`;
}

function today() {
  return new Date().toISOString().split("T")[0];
}

export default function AdminFinancePage() {
  const [draftRange, setDraftRange] = useState({ startDate: startOfMonth(), endDate: today() });
  const [appliedRange, setAppliedRange] = useState({ startDate: startOfMonth(), endDate: today() });
  const [journalId, setJournalId] = useState<string | null>(null);

  const { data: summary, isLoading: summaryLoading } = useFinanceSummary(appliedRange);
  const { data: transactions, isLoading: transactionsLoading } = useFinanceTransactions(appliedRange);
  const {
    data: journal,
    isLoading: journalLoading,
  } = useJournalEntry(journalId ?? undefined);

  const quickStats = useMemo(
    () => [
      { label: "Total Sales Revenue", value: summary?.totalSalesRevenue ?? 0 },
      { label: "Total COGS", value: summary?.totalCOGS ?? 0 },
      { label: "Refunds", value: summary?.totalRefunds ?? 0 },
      { label: "Inventory Value", value: summary?.inventoryValue ?? 0 },
    ],
    [summary],
  );

  const handleApply = () => {
    setAppliedRange(draftRange);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Finance Dashboard</h1>
            <p className="text-sm text-slate-600">Ringkasan kinerja keuangan POS dan Service dengan jurnal balance.</p>
          </div>
          <Badge variant="outline" className="flex items-center gap-2 border-slate-300 text-slate-700">
            <CalendarRange className="h-4 w-4" />
            {appliedRange.startDate} - {appliedRange.endDate}
          </Badge>
        </header>

        <DateFilter startDate={draftRange.startDate} endDate={draftRange.endDate} onChange={setDraftRange} onApply={handleApply} />

        <FinanceSummaryCards summary={summary} />

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-slate-800">Kinerja Transaksi</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-3">
                  <Wallet className="h-8 w-8 text-emerald-600" />
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Transaksi</p>
                    <p className="text-xl font-semibold text-slate-900">{summary?.transactionCount ?? 0}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-3">
                  <ClipboardList className="h-8 w-8 text-indigo-600" />
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Saldo Inventory</p>
                    <p className="text-xl font-semibold text-slate-900">{currency.format(summary?.inventoryValue ?? 0)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-slate-800">Ringkasan Detail</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {quickStats.map((item) => (
                <div key={item.label} className="rounded-lg border border-slate-200 bg-white p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">{item.label}</p>
                  <p className="text-xl font-semibold text-slate-900">{currency.format(item.value)}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <FinanceCharts transactions={transactions} />

        <Separator />

        <FinanceTable data={transactions} isLoading={transactionsLoading || summaryLoading} onSelectJournal={(id) => setJournalId(id)} />

        <JournalModal open={Boolean(journalId)} onOpenChange={(open) => !open && setJournalId(null)} entry={journal ?? undefined} isLoading={journalLoading} />
      </div>
    </div>
  );
}
