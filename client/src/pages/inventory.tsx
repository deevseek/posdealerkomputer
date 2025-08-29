import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function Inventory() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Inventory Management" 
          breadcrumb="Home / Inventory"
          action={
            <Button data-testid="button-add-product">
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          }
        />
        <main className="flex-1 overflow-y-auto p-6">
          <Card>
            <CardHeader>
              <CardTitle>Products & Stock</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Product and inventory management interface will be implemented here.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
