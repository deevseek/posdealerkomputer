import { Switch, Route } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import Dashboard from "@/pages/dashboard";
import ServiceTickets from "@/pages/service-tickets";
import Inventory from "@/pages/inventory";
import Customers from "@/pages/customers";
import Suppliers from "@/pages/suppliers";
import FinanceNew from "@/pages/finance-new";
import Reports from "@/pages/reports";
import Settings from "@/pages/settings";
import WarrantyPage from "@/pages/warranty";
import DamagedGoodsPage from "@/pages/damaged-goods";
import NotFoundPage from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const response = await fetch(queryKey[0] as string, {
          credentials: "include",
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      },
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/service" component={ServiceTickets} />
        <Route path="/inventory" component={Inventory} />
        <Route path="/customers" component={Customers} />
        <Route path="/suppliers" component={Suppliers} />
        <Route path="/finance" component={FinanceNew} />
        <Route path="/reports" component={Reports} />
        <Route path="/settings" component={Settings} />
        <Route path="/warranty" component={WarrantyPage} />
        <Route path="/damaged-goods" component={DamagedGoodsPage} />
        <Route component={NotFoundPage} />
      </Switch>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
