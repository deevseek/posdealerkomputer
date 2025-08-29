import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function Suppliers() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Supplier Management" 
          breadcrumb="Home / Suppliers"
          action={
            <Button data-testid="button-add-supplier">
              <Plus className="w-4 h-4 mr-2" />
              Add Supplier
            </Button>
          }
        />
        <main className="flex-1 overflow-y-auto p-6">
          <Card>
            <CardHeader>
              <CardTitle>Supplier Database</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Supplier management interface will be implemented here.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
