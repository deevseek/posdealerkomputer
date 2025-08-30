import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import POS from "@/pages/pos";
import ServiceTickets from "@/pages/service-tickets";
import Inventory from "@/pages/inventory";
import Customers from "@/pages/customers";
import Suppliers from "@/pages/suppliers";
import Financial from "@/pages/financial";
import FinanceNew from "@/pages/finance-new";
import Reports from "@/pages/reports";
import StockMovements from "@/pages/stock-movements";
import Settings from "@/pages/settings";
import RolesPage from "@/pages/roles";
import UsersPage from "@/pages/users";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Login} />
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/pos" component={POS} />
          <Route path="/service" component={ServiceTickets} />
          <Route path="/inventory" component={Inventory} />
          <Route path="/customers" component={Customers} />
          <Route path="/suppliers" component={Suppliers} />
          <Route path="/financial" component={Financial} />
          <Route path="/finance-new" component={FinanceNew} />
          <Route path="/users" component={UsersPage} />
          <Route path="/roles" component={RolesPage} />
          <Route path="/reports" component={Reports} />
          <Route path="/stock-movements" component={StockMovements} />
          <Route path="/settings" component={Settings} />
        </>
      )}
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
