import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { FinancialRecord } from "@/types/finance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const currency = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
});

interface FinanceChartsProps {
  transactions?: FinancialRecord[];
}

function buildLineSeries(transactions: FinancialRecord[] = []) {
  const grouped: Record<string, { date: string; income: number; expense: number }> = {};

  transactions.forEach((tx) => {
    const date = tx.createdAt.split("T")[0];
    if (!grouped[date]) {
      grouped[date] = { date, income: 0, expense: 0 };
    }
    if (tx.type === "income") {
      grouped[date].income += tx.amount;
    } else if (tx.type === "expense") {
      grouped[date].expense += tx.amount;
    }
  });

  if (Object.keys(grouped).length === 0) {
    return [
      { date: "2024-01-01", income: 0, expense: 0 },
      { date: "2024-01-02", income: 0, expense: 0 },
      { date: "2024-01-03", income: 0, expense: 0 },
    ];
  }

  return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
}

function buildRevenueSeries(transactions: FinancialRecord[] = []) {
  const base = { pos: 0, service: 0 };
  return transactions.reduce(
    (acc, tx) => {
      if (tx.category === "sales_revenue") {
        acc.pos += tx.amount;
      }
      if (tx.category === "service_revenue") {
        acc.service += tx.amount;
      }
      return acc;
    },
    { ...base },
  );
}

function buildCOGSSeries(transactions: FinancialRecord[] = []) {
  const base = { pos: 0, service: 0 };
  return transactions.reduce(
    (acc, tx) => {
      if (tx.category !== "cogs") return acc;
      if (tx.referenceType?.toLowerCase().includes("service")) {
        acc.service += tx.amount;
      } else {
        acc.pos += tx.amount;
      }
      return acc;
    },
    { ...base },
  );
}

export function FinanceCharts({ transactions }: FinanceChartsProps) {
  const lineData = buildLineSeries(transactions);
  const revenue = buildRevenueSeries(transactions);
  const cogs = buildCOGSSeries(transactions);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="border border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-800">Pendapatan vs Pengeluaran</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineData} margin={{ left: 12, right: 12 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
              <XAxis dataKey="date" tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(value) => currency.format(value)} tickLine={false} axisLine={false} />
              <Tooltip formatter={(value: number) => currency.format(value)} />
              <Legend />
              <Line type="monotone" dataKey="income" stroke="#16a34a" strokeWidth={2} dot={false} name="Pendapatan" />
              <Line type="monotone" dataKey="expense" stroke="#dc2626" strokeWidth={2} dot={false} name="Pengeluaran" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        <Card className="border border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-800">Revenue POS vs Service</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[{ label: "Revenue", pos: revenue.pos, service: revenue.service }]}
                margin={{ left: 12, right: 12 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(value) => currency.format(value)} tickLine={false} axisLine={false} />
                <Tooltip formatter={(value: number) => currency.format(value)} />
                <Legend />
                <Bar dataKey="pos" name="POS" fill="#2563eb" radius={[4, 4, 0, 0]} />
                <Bar dataKey="service" name="Service" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-800">COGS POS vs Service</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[{ label: "COGS", pos: cogs.pos, service: cogs.service }]} margin={{ left: 12, right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(value) => currency.format(value)} tickLine={false} axisLine={false} />
                <Tooltip formatter={(value: number) => currency.format(value)} />
                <Legend />
                <Bar dataKey="pos" name="POS" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="service" name="Service" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
