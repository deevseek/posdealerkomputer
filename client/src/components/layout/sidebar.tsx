import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  ChartLine, 
  ScanBarcode, 
  Wrench, 
  Package, 
  PieChart, 
  Users, 
  Truck, 
  FileText, 
  Settings,
  ChevronLeft,
  ChevronRight,
  Laptop,
  Shield,
  UserCog,
  Layers,
  LogOut,
  User,
  ShoppingCart,
  Clock
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const navigation = [
  { name: "Dasbor", href: "/", icon: ChartLine, roles: ["admin", "kasir", "teknisi", "purchasing", "finance", "owner"] },
  { name: "Kasir", href: "/pos", icon: ScanBarcode, roles: ["admin", "kasir", "owner"] },
  { name: "Servis", href: "/service", icon: Wrench, roles: ["admin", "teknisi", "owner"] },
  { name: "Inventori", href: "/inventory", icon: Package, roles: ["admin", "purchasing", "owner"] },
  { name: "Pembelian", href: "/purchasing", icon: ShoppingCart, roles: ["admin", "purchasing", "owner"] },
  { name: "Keuangan & Gaji", href: "/finance", icon: PieChart, roles: ["admin", "finance", "owner"] },
  { name: "Pelanggan", href: "/customers", icon: Users, roles: ["admin", "kasir", "teknisi", "purchasing", "finance", "owner"] },
  { name: "Supplier", href: "/suppliers", icon: Truck, roles: ["admin", "purchasing", "owner"] },
  { name: "Pengguna", href: "/users", icon: UserCog, roles: ["admin", "owner"] },
  { name: "Peran", href: "/roles", icon: Shield, roles: ["admin", "owner"] },
  { name: "Laporan", href: "/reports", icon: FileText, roles: ["admin", "finance", "owner"] },
  { name: "Pergerakan Stok", href: "/stock-movements", icon: Layers, roles: ["admin", "purchasing", "owner"] },
  { name: "Management Garansi", href: "/warranty", icon: Clock, roles: ["admin", "kasir", "teknisi", "owner"] },
  { name: "Pengaturan", href: "/settings", icon: Settings, roles: ["admin", "owner"] },
];

export default function Sidebar() {
  // Use localStorage to persist sidebar state
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved ? JSON.parse(saved) : false;
  });
  const [location] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  // Get store config for app name - WITH BETTER CACHING
  const { data: storeConfig } = useQuery({
    queryKey: ['store-config'], // Changed key format
    queryFn: async () => {
      const response = await fetch('/api/store-config', { credentials: 'include' });
      if (!response.ok) return { name: 'LaptopPOS' };
      return response.json();
    },
    staleTime: Infinity,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: false,
  });

  const userRole = (user as any)?.role || "kasir";

  const logoutMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/auth/logout');
    },
    onSuccess: () => {
      toast({
        title: "Logout Berhasil",
        description: "Anda telah berhasil logout.",
      });
      // Reload to trigger authentication state update
      window.location.href = "/";
    },
    onError: (error: any) => {
      toast({
        title: "Error Logout",
        description: error.message || "Gagal logout",
        variant: "destructive",
      });
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // Save sidebar state to localStorage when it changes
  const toggleCollapsed = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    localStorage.setItem('sidebarCollapsed', JSON.stringify(newCollapsed));
  };

  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(userRole)
  );

  return (
    <aside 
      className={cn(
        "transition-all duration-300 bg-card border-r border-border flex flex-col shadow-sm",
        isCollapsed ? "w-16" : "w-64"
      )}
      data-testid="sidebar"
    >
      <div className="p-4 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Laptop className="w-4 h-4 text-primary-foreground" />
          </div>
          {!isCollapsed && (
            <div className="transition-opacity duration-300">
              <h1 className="text-lg font-semibold text-foreground">{(storeConfig as any)?.name || 'LaptopPOS'}</h1>
              <p className="text-xs text-muted-foreground">Servis & Penjualan</p>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {filteredNavigation.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          
          return (
            <Link key={item.name} href={item.href}>
              <div
                className={cn(
                  "flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                data-testid={`nav-item-${item.name.toLowerCase()}`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && (
                  <span className="transition-opacity duration-300">{item.name}</span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border space-y-2">
        {/* User Info */}
        {!isCollapsed && (
          <div className="flex items-center space-x-3 px-3 py-2 rounded-md bg-muted/50">
            <User className="w-4 h-4 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {(user as any)?.username || (user as any)?.firstName || "User"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {userRole}
              </p>
            </div>
          </div>
        )}
        
        {/* Logout Button */}
        <Button
          variant="ghost" 
          size="sm"
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
          className={cn(
            "w-full flex items-center text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950",
            isCollapsed ? "justify-center" : "justify-start space-x-3 px-3"
          )}
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4" />
          {!isCollapsed && (
            <span className="transition-opacity duration-300">
              {logoutMutation.isPending ? "Keluar..." : "Keluar"}
            </span>
          )}
        </Button>
        
        {/* Collapse Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleCollapsed}
          className="w-full flex items-center justify-center"
          data-testid="button-collapse-sidebar"
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </Button>
      </div>
    </aside>
  );
}
