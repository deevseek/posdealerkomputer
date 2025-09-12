import { Switch, Route } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
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
        <Route path="/" component={WarrantyPage} />
        <Route path="/warranty" component={WarrantyPage} />
        <Route path="/damaged-goods" component={DamagedGoodsPage} />
        <Route component={NotFoundPage} />
      </Switch>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
