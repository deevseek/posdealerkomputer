import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalendarSearch } from "lucide-react";

interface DateFilterProps {
  startDate: string;
  endDate: string;
  onChange: (range: { startDate: string; endDate: string }) => void;
  onApply?: () => void;
}

export function DateFilter({ startDate, endDate, onChange, onApply }: DateFilterProps) {
  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  return (
    <Card className="border border-slate-200 shadow-sm">
      <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">Start Date</label>
            <Input
              type="date"
              max={today}
              value={startDate}
              onChange={(e) => onChange({ startDate: e.target.value, endDate })}
              className="w-full sm:w-48"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">End Date</label>
            <Input
              type="date"
              max={today}
              value={endDate}
              onChange={(e) => onChange({ startDate, endDate: e.target.value })}
              className="w-full sm:w-48"
            />
          </div>
        </div>
        <Button
          type="button"
          onClick={() => onApply?.()}
          className="w-full sm:w-auto"
        >
          <CalendarSearch className="mr-2 h-4 w-4" />
          Terapkan
        </Button>
      </CardContent>
    </Card>
  );
}
