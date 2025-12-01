import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { JournalEntry } from "@/types/finance";

const currency = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
});

interface JournalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: JournalEntry | null;
  isLoading?: boolean;
}

export function JournalModal({ open, onOpenChange, entry, isLoading }: JournalModalProps) {
  const totalDebit = entry?.lines.reduce((sum, line) => sum + line.debit, 0) ?? 0;
  const totalCredit = entry?.lines.reduce((sum, line) => sum + line.credit, 0) ?? 0;
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Detail Journal Entry</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="py-10 text-center text-sm text-slate-500">Memuat jurnal...</div>
        ) : entry ? (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-700">Journal Number</p>
                <p className="text-base text-slate-900">{entry.journalNumber}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-700">Date</p>
                <p className="text-base text-slate-900">{entry.date?.split("T")[0]}</p>
              </div>
            </div>
            <Separator />
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Akun</TableHead>
                    <TableHead className="w-24">Debit</TableHead>
                    <TableHead className="w-24">Credit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entry.lines.map((line, idx) => (
                    <TableRow key={`${line.accountCode}-${idx}`}>
                      <TableCell>
                        <div className="font-semibold text-slate-900">{line.accountName}</div>
                        <div className="text-xs uppercase tracking-wide text-slate-500">{line.accountCode}</div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-semibold text-emerald-700">
                        {line.debit ? currency.format(line.debit) : "-"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-semibold text-rose-700">
                        {line.credit ? currency.format(line.credit) : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell className="font-semibold text-slate-800">Total</TableCell>
                    <TableCell className="whitespace-nowrap font-semibold text-emerald-700">{currency.format(totalDebit)}</TableCell>
                    <TableCell className="whitespace-nowrap font-semibold text-rose-700">{currency.format(totalCredit)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="space-y-1 text-sm">
                <p className="font-semibold text-slate-800">Balance Check</p>
                <p className="text-slate-600">
                  Jurnal harus seimbang. Pastikan total debit dan kredit sama untuk menjaga konsistensi laporan.
                </p>
              </div>
              <Badge variant={balanced ? "default" : "destructive"} className="text-sm">
                {balanced ? "Balanced" : "Unbalanced"}
              </Badge>
            </div>
          </div>
        ) : (
          <div className="py-10 text-center text-sm text-slate-500">Jurnal tidak ditemukan.</div>
        )}
      </DialogContent>
    </Dialog>
  );
}
