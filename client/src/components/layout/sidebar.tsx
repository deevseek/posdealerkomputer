import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Package, 
  Wrench, 
  Warehouse, 
  ShoppingCart, 
  Calculator,
  Users,
  Truck,
  ClipboardList,
  BarChart3,
  FileText,
  Settings,
  Shield,
  AlertTriangle,
  Key,
  LogOut,
  User
} from "lucide-react";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Package, label: "Aset", href: "/assets" },
  { icon: Wrench, label: "Servis", href: "/service" },
  { icon: Warehouse, label: "Inventori", href: "/inventory" },
  { icon: ShoppingCart, label: "Pembelian", href: "/purchase" },
  { icon: Calculator, label: "Keuangan & Gaji", href: "/finance" },
  { icon: Users, label: "Pelanggan", href: "/customers" },
  { icon: Truck, label: "Supplier", href: "/suppliers" },
  { icon: ClipboardList, label: "Pengadaan", href: "/procurement" },
  { icon: BarChart3, label: "Peran", href: "/roles" },
  { icon: FileText, label: "Laporan", href: "/reports" },
  { icon: Settings, label: "Pengaturan Akun", href: "/account-settings" },
  { icon: Shield, label: "Management Garansi", href: "/warranty" },
  { icon: Key, label: "Pengaturan", href: "/settings" },
];

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="w-64 bg-gray-900 text-white flex-shrink-0 flex flex-col">
      <div className="p-4 flex-1">
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Shield className="text-white h-4 w-4" />
          </div>
          <div>
            <h1 className="font-bold text-lg">Ant Komputer</h1>
            <p className="text-xs text-gray-400">Servis & Penjualan</p>
          </div>
        </div>
        
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            const isWarrantyActive = location === "/warranty";
            const isDamagedGoodsActive = location === "/damaged-goods";
            
            return (
              <div key={item.href}>
                <Link 
                  href={item.href}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive 
                      ? "bg-primary text-white" 
                      : "text-gray-300 hover:bg-gray-800 hover:text-white"
                  }`}
                  data-testid={`nav-${item.label.toLowerCase().replace(/ /g, '-')}`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
                
                {/* Sub-menu for Management Garansi */}
                {item.href === "/warranty" && (isWarrantyActive || isDamagedGoodsActive) && (
                  <div className="ml-6 mt-1">
                    <Link 
                      href="/damaged-goods"
                      className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                        isDamagedGoodsActive 
                          ? "text-primary bg-primary/10 border-l-2 border-primary" 
                          : "text-gray-300 hover:bg-gray-800 hover:text-white"
                      }`}
                      data-testid="nav-damaged-goods"
                    >
                      <AlertTriangle className="w-5 h-5" />
                      <span>Barang Rusak</span>
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>
      
      <div className="p-4">
        <div className="flex items-center space-x-3 p-3 bg-gray-800 rounded-lg mb-2">
          <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
            <User className="text-gray-300 h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">administrator</p>
            <p className="text-xs text-gray-400">Admin</p>
          </div>
        </div>
        <button 
          className="w-full flex items-center justify-center space-x-2 p-2 text-gray-400 hover:text-white transition-colors"
          data-testid="button-logout"
        >
          <LogOut className="h-4 w-4" />
          <span className="text-sm">Keluar</span>
        </button>
      </div>
    </div>
  );
}
