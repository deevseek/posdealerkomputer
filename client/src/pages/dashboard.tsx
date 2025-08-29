import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import StatCard from "@/components/dashboard/stat-card";
import RecentTransactions from "@/components/dashboard/recent-transactions";
import QuickActions from "@/components/dashboard/quick-actions";
import ServiceStatus from "@/components/dashboard/service-status";
import InventoryAlerts from "@/components/dashboard/inventory-alerts";
import { useQuery } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    retry: false,
  });

  if (isLoading || !isAuthenticated) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Dashboard" breadcrumb="Home / Dashboard" />
        <main className="flex-1 overflow-y-auto p-6">
          {/* Dashboard Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Today's Sales"
              value={statsLoading ? "Loading..." : `Rp ${Number(stats?.todaySales || 0).toLocaleString('id-ID')}`}
              change="+12% from yesterday"
              icon="money-bill-wave"
              color="primary"
              data-testid="stat-today-sales"
            />
            <StatCard
              title="Active Services"
              value={statsLoading ? "Loading..." : stats?.activeServices?.toString() || "0"}
              change="5 urgent"
              icon="tools"
              color="accent"
              data-testid="stat-active-services"
            />
            <StatCard
              title="Low Stock Items"
              value={statsLoading ? "Loading..." : stats?.lowStockCount?.toString() || "0"}
              change="Requires attention"
              icon="exclamation-triangle"
              color="destructive"
              data-testid="stat-low-stock"
            />
            <StatCard
              title="Monthly Profit"
              value={statsLoading ? "Loading..." : `Rp ${Number(stats?.monthlyProfit || 0).toLocaleString('id-ID')}`}
              change="+8% this month"
              icon="chart-line"
              color="accent"
              data-testid="stat-monthly-profit"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2">
              <RecentTransactions />
            </div>
            <QuickActions />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ServiceStatus />
            <InventoryAlerts />
          </div>
        </main>
      </div>
    </div>
  );
}
