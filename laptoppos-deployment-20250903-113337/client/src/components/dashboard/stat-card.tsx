import { Card, CardContent } from "@/components/ui/card";
import { 
  DollarSign, 
  Wrench, 
  AlertTriangle, 
  TrendingUp,
  Package
} from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  icon: string;
  color: "primary" | "accent" | "destructive" | "secondary";
  "data-testid"?: string;
}

const iconMap = {
  "money-bill-wave": DollarSign,
  "tools": Wrench,
  "exclamation-triangle": AlertTriangle,
  "chart-line": TrendingUp,
  "package": Package,
};

const colorMap = {
  primary: "bg-primary/10 text-primary",
  accent: "bg-accent/10 text-accent",
  destructive: "bg-destructive/10 text-destructive",
  secondary: "bg-secondary/10 text-secondary",
};

export default function StatCard({ title, value, change, icon, color, ...props }: StatCardProps) {
  const IconComponent = iconMap[icon as keyof typeof iconMap] || DollarSign;
  
  return (
    <Card className="shadow-sm" {...props}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-foreground" data-testid={`stat-value-${title.toLowerCase().replace(/\s+/g, '-')}`}>
              {value}
            </p>
            <p className="text-sm text-accent mt-1">
              {change}
            </p>
          </div>
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
            <IconComponent className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
