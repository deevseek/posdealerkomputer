import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  Wrench, 
  Package, 
  UserPlus, 
  FileDown 
} from "lucide-react";
import { useLocation } from "wouter";

export default function QuickActions() {
  const [, setLocation] = useLocation();

  const actions = [
    {
      title: "Penjualan Baru",
      icon: Plus,
      onClick: () => setLocation("/pos"),
      variant: "default" as const,
      testId: "button-quick-new-sale"
    },
    {
      title: "Servis Baru",
      icon: Wrench,
      onClick: () => setLocation("/service"),
      variant: "outline" as const,
      testId: "button-quick-new-service"
    },
    {
      title: "Tambah Produk",
      icon: Package,
      onClick: () => setLocation("/inventory"),
      variant: "outline" as const,
      testId: "button-quick-add-product"
    },
    {
      title: "Tambah Pelanggan",
      icon: UserPlus,
      onClick: () => setLocation("/customers"),
      variant: "outline" as const,
      testId: "button-quick-add-customer"
    },
    {
      title: "Buat Laporan",
      icon: FileDown,
      onClick: () => setLocation("/reports"),
      variant: "outline" as const,
      testId: "button-quick-generate-report"
    },
  ];

  return (
    <Card className="shadow-sm">
      <CardHeader className="border-b">
        <CardTitle>Aksi Cepat</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-3">
          {actions.map((action) => (
            <Button
              key={action.title}
              variant={action.variant}
              onClick={action.onClick}
              className="w-full justify-start h-12"
              data-testid={action.testId}
            >
              <action.icon className="w-4 h-4 mr-3" />
              {action.title}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
