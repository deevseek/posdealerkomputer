import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";

export default function SaasManagement() {
  const [activeTab, setActiveTab] = useState("plans");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch plans
  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ["saas-plans"],
    queryFn: async () => {
      const response = await fetch("/api/saas/plans", { credentials: "include" });
      if (!response.ok) return [];
      return response.json();
    },
    staleTime: 60000,
  });

  // Add/Edit/Delete plan mutation (placeholder)
  const planMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/saas/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Gagal menyimpan paket");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saas-plans"] });
      toast({ title: "Berhasil", description: "Paket berhasil disimpan" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error?.message || "Gagal menyimpan paket", variant: "destructive" });
    },
  });

  // SaaS config fetch (branding, fitur, limit, dsb)
  const { data: saasConfig, isLoading: configLoading } = useQuery({
    queryKey: ["saas-config"],
    queryFn: async () => {
      const response = await fetch("/api/saas/config", { credentials: "include" });
      if (!response.ok) return {};
      return response.json();
    },
    staleTime: 60000,
  });

  // SaaS config mutation (placeholder)
  const configMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/saas/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Gagal update pengaturan SaaS");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saas-config"] });
      toast({ title: "Berhasil", description: "Pengaturan SaaS berhasil diupdate" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error?.message || "Gagal update pengaturan", variant: "destructive" });
    },
  });

  // Form handlers (placeholder)
  const handlePlanSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("planName"),
      price: formData.get("planPrice"),
      features: formData.get("planFeatures"),
      limit: formData.get("planLimit"),
    };
    planMutation.mutate(data);
  };

  const handleConfigSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      branding: formData.get("branding"),
      maxClients: formData.get("maxClients"),
      enableFeatureX: formData.get("enableFeatureX") === "on",
    };
    configMutation.mutate(data);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="SaaS Management" breadcrumb="Admin / SaaS Management" />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            <h1 className="text-3xl font-bold">SaaS Management</h1>
            <p className="text-muted-foreground">Kelola paket berlangganan dan pengaturan SaaS</p>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="plans">Paket Berlangganan</TabsTrigger>
                <TabsTrigger value="config">Pengaturan SaaS</TabsTrigger>
              </TabsList>
              <TabsContent value="plans" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Daftar Paket</CardTitle>
                    <CardDescription>Kelola paket berlangganan yang tersedia</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handlePlanSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="planName">Nama Paket</Label>
                        <Input id="planName" name="planName" placeholder="Nama paket" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="planPrice">Harga Paket</Label>
                        <Input id="planPrice" name="planPrice" type="number" placeholder="Harga" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="planFeatures">Fitur</Label>
                        <Input id="planFeatures" name="planFeatures" placeholder="Fitur (pisahkan dengan koma)" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="planLimit">Limit</Label>
                        <Input id="planLimit" name="planLimit" type="number" placeholder="Limit" />
                      </div>
                      <Button type="submit" disabled={planMutation.isPending}>
                        {planMutation.isPending ? "Menyimpan..." : "Simpan Paket"}
                      </Button>
                    </form>
                    <div className="mt-6">
                      {plansLoading ? (
                        <div>Memuat paket...</div>
                      ) : (
                        <ul className="space-y-2">
                          {(plans || []).map((plan: any) => (
                            <li key={plan.id} className="border p-2 rounded">
                              <strong>{plan.name}</strong> - Rp{plan.price}<br />
                              Fitur: {plan.features}<br />
                              Limit: {plan.limit}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="config" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Pengaturan SaaS</CardTitle>
                    <CardDescription>Branding, fitur, dan limit sistem</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleConfigSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="branding">Branding</Label>
                        <Input id="branding" name="branding" defaultValue={saasConfig?.branding || ""} placeholder="Nama branding" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="maxClients">Max Client</Label>
                        <Input id="maxClients" name="maxClients" type="number" defaultValue={saasConfig?.maxClients || 10} placeholder="Jumlah maksimal client" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="enableFeatureX">Aktifkan Fitur X</Label>
                        <Input id="enableFeatureX" name="enableFeatureX" type="checkbox" defaultChecked={!!saasConfig?.enableFeatureX} />
                      </div>
                      <Button type="submit" disabled={configMutation.isPending}>
                        {configMutation.isPending ? "Menyimpan..." : "Simpan Pengaturan"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}
