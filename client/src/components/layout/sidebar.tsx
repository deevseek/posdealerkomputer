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
  Laptop
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const navigation = [
  { name: "Dashboard", href: "/", icon: ChartLine, roles: ["admin", "kasir", "teknisi", "purchasing", "finance", "owner"] },
  { name: "POS", href: "/pos", icon: ScanBarcode, roles: ["admin", "kasir", "owner"] },
  { name: "Service", href: "/service", icon: Wrench, roles: ["admin", "teknisi", "owner"] },
  { name: "Inventory", href: "/inventory", icon: Package, roles: ["admin", "purchasing", "owner"] },
  { name: "Financial", href: "/financial", icon: PieChart, roles: ["admin", "finance", "owner"] },
  { name: "Customers", href: "/customers", icon: Users, roles: ["admin", "kasir", "teknisi", "purchasing", "finance", "owner"] },
  { name: "Suppliers", href: "/suppliers", icon: Truck, roles: ["admin", "purchasing", "owner"] },
  { name: "Reports", href: "/reports", icon: FileText, roles: ["admin", "finance", "owner"] },
  { name: "Settings", href: "/settings", icon: Settings, roles: ["admin", "owner"] },
];

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [location] = useLocation();
  const { user } = useAuth();

  const userRole = user?.role || "kasir";

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
              <h1 className="text-lg font-semibold text-foreground">LaptopPOS</h1>
              <p className="text-xs text-muted-foreground">Service & Sales</p>
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

      <div className="p-4 border-t border-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
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
