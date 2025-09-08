import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useSetup } from "@/hooks/useSetup";
import { useWebSocket } from "@/lib/websocket";
import { useEffect } from "react";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import POS from "@/pages/pos";
import ServiceTickets from "@/pages/service-tickets";
import Inventory from "@/pages/inventory";
import Purchasing from "@/pages/purchasing";
import Customers from "@/pages/customers";
import Suppliers from "@/pages/suppliers";
import Financial from "@/pages/financial";
import FinanceNew from "@/pages/finance-new";
import Reports from "@/pages/reports";
import StockMovements from "@/pages/stock-movements";
import Settings from "@/pages/settings";
import RolesPage from "@/pages/roles";
import UsersPage from "@/pages/users";
import ServiceStatus from "@/pages/ServiceStatus";
import Setup from "@/pages/setup";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminSaaS from "@/pages/admin-saas";
import ClientOnboarding from "@/pages/client-onboarding";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  const { needsSetup, isSetupLoading, setupStatus, error } = useSetup();
  const { connect, disconnect } = useWebSocket();

  // Connect to WebSocket when authenticated
  useEffect(() => {
    if (isAuthenticated && !needsSetup && !isSetupLoading) {
      console.log('🔄 Connecting to real-time updates...');
      connect();
    } else {
      disconnect();
    }

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [isAuthenticated, needsSetup, isSetupLoading, connect, disconnect]);

  // Debug logging for development
  if (process.env.NODE_ENV === 'development') {
    console.log('Router Debug:', {
      needsSetup,
      isSetupLoading,
      setupStatus,
      isAuthenticated,
      isLoading,
      error: error?.message
    });
  }

  // Show setup if not completed (regardless of auth status)
  if (needsSetup || isSetupLoading) {
    return (
      <Switch>
        <Route path="/setup" component={Setup} />
        <Route path="*" component={Setup} /> {/* Redirect all routes to setup */}
      </Switch>
    );
  }

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <>
          <Route path="/" component={Login} />
          <Route path="/login" component={Login} />
        </>
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/pos" component={POS} />
          <Route path="/service" component={ServiceTickets} />
          <Route path="/inventory" component={Inventory} />
          <Route path="/purchasing" component={Purchasing} />
          <Route path="/customers" component={Customers} />
          <Route path="/suppliers" component={Suppliers} />
          <Route path="/financial" component={Financial} />
          <Route path="/finance-new" component={FinanceNew} />
          <Route path="/users" component={UsersPage} />
          <Route path="/roles" component={RolesPage} />
          <Route path="/reports" component={Reports} />
          <Route path="/stock-movements" component={StockMovements} />
          <Route path="/settings" component={Settings} />
          <Route path="/admin-dashboard" component={AdminDashboard} />
          <Route path="/admin-saas" component={AdminSaaS} />
        </>
      )}
      <Route path="/service-status" component={ServiceStatus} />
      <Route path="/setup" component={Setup} />
      <Route path="/client-onboarding" component={ClientOnboarding} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
