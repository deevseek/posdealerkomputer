import { useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FinancialRecord } from "@/types/finance";
import { ArrowUpDown, Eye } from "lucide-react";

const currency = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
});

type SortKey = keyof Pick<FinancialRecord, "createdAt" | "amount" | "category" | "type">;

type SortState = {
  key: SortKey;
  direction: "asc" | "desc";
};

interface FinanceTableProps {
  data?: FinancialRecord[];
  isLoading?: boolean;
  onSelectJournal?: (journalId: string) => void;
}

export function FinanceTable({ data = [], isLoading, onSelectJournal }: FinanceTableProps) {
  const [sort, setSort] = useState<SortState>({ key: "createdAt", direction: "desc" });

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      const multiplier = sort.direction === "asc" ? 1 : -1;
      if (sort.key === "amount") {
        return (a.amount - b.amount) * multiplier;
      }
      return a[sort.key].localeCompare(b[sort.key]) * multiplier;
    });
  }, [data, sort]);

  const handleSort = (key: SortKey) => {
    setSort((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  return (
    <Card className="border border-slate-200 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base font-semibold text-slate-800">Financial Records</CardTitle>
      </CardHeader>
      <CardContent className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">
                  <Button variant="ghost" className="px-0" onClick={() => handleSort("createdAt")}>
                    Tanggal
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Subkategori</TableHead>
                <TableHead className="whitespace-nowrap">
                  <Button variant="ghost" className="px-0" onClick={() => handleSort("amount")}>
                    Jumlah
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>Metode</TableHead>
                <TableHead>Referensi</TableHead>
                <TableHead className="text-right">Jurnal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-slate-500">
                    Memuat data...
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && sorted.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-slate-500">
                    Tidak ada data untuk rentang tanggal ini.
                  </TableCell>
                </TableRow>
              )}
              {!isLoading &&
                sorted.map((item) => {
                  const formattedDate = item.createdAt ? item.createdAt.split("T")[0] : "-";
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="whitespace-nowrap text-slate-700">{formattedDate}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        item.type === "income"
                          ? "default"
                          : item.type === "asset"
                            ? "secondary"
                            : item.type === "transfer"
                              ? "outline"
                              : "destructive"
                      }
                      className="capitalize"
                    >
                      {item.type}
                    </Badge>
                  </TableCell>
                      <TableCell className="capitalize">{item.category.replace("_", " ")}</TableCell>
                      <TableCell className="capitalize">{item.subcategory || "-"}</TableCell>
                      <TableCell className="whitespace-nowrap font-semibold text-slate-900">
                        {currency.format(item.amount)}
                      </TableCell>
                      <TableCell className="capitalize text-slate-700">{item.paymentMethod || "-"}</TableCell>
                      <TableCell className="text-slate-700">
                        {item.referenceType ? `${item.referenceType}${item.reference ? ` #${item.reference}` : ""}` : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.journalId ? (
                          <Button variant="outline" size="sm" onClick={() => onSelectJournal?.(item.journalId!)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Lihat
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-500">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
