import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { FinanceSummary } from "@/types/finance";
import { ArrowDownRight, ArrowUpRight, PiggyBank, Wallet } from "lucide-react";

const currency = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
});

interface FinanceSummaryCardsProps {
  summary?: FinanceSummary;
}

const stats: { key: keyof FinanceSummary; label: string; icon: React.ElementType; tone: "positive" | "negative" | "neutral" }[] = [
  { key: "totalIncome", label: "Pendapatan", icon: ArrowUpRight, tone: "positive" },
  { key: "totalExpense", label: "Pengeluaran", icon: ArrowDownRight, tone: "negative" },
  { key: "grossProfit", label: "Laba Kotor", icon: PiggyBank, tone: "positive" },
  { key: "netProfit", label: "Laba Bersih", icon: Wallet, tone: "positive" },
];

export function FinanceSummaryCards({ summary }: FinanceSummaryCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map(({ key, label, icon: Icon, tone }) => {
        const value = summary?.[key] ?? 0;
        const badgeVariant =
          tone === "positive" ? "default" : tone === "negative" ? "destructive" : "secondary";

        return (
          <Card key={key} className="border border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">{label}</CardTitle>
              <Badge variant={badgeVariant} className="capitalize">
                {tone === "negative" ? "Expense" : "Income"}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-semibold text-slate-900">{currency.format(value)}</div>
                <div className={`rounded-full p-2 ${tone === "negative" ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600"}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
