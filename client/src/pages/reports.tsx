import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Reports() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Reports" breadcrumb="Home / Reports" />
        <main className="flex-1 overflow-y-auto p-6">
          <Card>
            <CardHeader>
              <CardTitle>Business Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Report generation interface will be implemented here.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
