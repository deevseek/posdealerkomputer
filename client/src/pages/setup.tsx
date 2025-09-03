import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle, Circle, Store, User, Settings, ArrowRight, Loader2, Database } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface SetupStatus {
  setupCompleted: boolean;
  hasStoreConfig: boolean;
  hasAdminUser: boolean;
  storeName?: string;
  databaseMigrated?: boolean;
  setupSteps: {
    store?: boolean;
    database?: boolean;
    admin?: boolean;
    completed?: boolean;
  };
}

export default function Setup() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [setupData, setSetupData] = useState({
    storeName: '',
    storeAddress: '',
    storePhone: '',
    storeEmail: '',
    adminUsername: '',
    adminPassword: '',
    adminEmail: '',
    adminFirstName: '',
    adminLastName: '',
  });

  // Check setup status
  const { data: setupStatus, isLoading } = useQuery<SetupStatus>({
    queryKey: ['/api/setup/status'],
    refetchInterval: false,
  });

  useEffect(() => {
    // Redirect if setup is already completed
    if (setupStatus?.setupCompleted) {
      toast({
        title: "Setup Completed",
        description: "Application is already set up. Redirecting to dashboard...",
      });
      setTimeout(() => setLocation('/dashboard'), 2000);
    }
  }, [setupStatus, setLocation, toast]);

  // Store setup mutation
  const storeSetupMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/setup/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to setup store');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Store Setup Complete",
        description: "Store configuration has been saved successfully",
      });
      setCurrentStep(3);
    },
    onError: (error: Error) => {
      toast({
        title: "Setup Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Database migration mutation
  const databaseMigrationMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/setup/migrate-database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to migrate database');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Database Migration Complete",
        description: "Database schema has been migrated successfully",
      });
      setCurrentStep(2);
    },
    onError: (error: Error) => {
      toast({
        title: "Migration Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Admin setup mutation
  const adminSetupMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/setup/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create admin user');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Admin User Created",
        description: "Admin user has been created successfully",
      });
      setCurrentStep(4);
    },
    onError: (error: Error) => {
      toast({
        title: "Setup Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Complete setup mutation
  const completeSetupMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/setup/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to complete setup');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Setup Completed!",
        description: "Application setup completed successfully. Redirecting to login...",
      });
      setTimeout(() => setLocation('/login'), 2000);
    },
    onError: (error: Error) => {
      toast({
        title: "Setup Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleStoreSetup = () => {
    if (!setupData.storeName.trim()) {
      toast({
        title: "Validation Error",
        description: "Store name is required",
        variant: "destructive",
      });
      return;
    }

    storeSetupMutation.mutate({
      name: setupData.storeName,
      address: setupData.storeAddress,
      phone: setupData.storePhone,
      email: setupData.storeEmail,
      taxRate: '11.00',
    });
  };

  const handleAdminSetup = () => {
    if (!setupData.adminUsername.trim() || !setupData.adminPassword.trim() || !setupData.adminEmail.trim()) {
      toast({
        title: "Validation Error",
        description: "Username, password, and email are required",
        variant: "destructive",
      });
      return;
    }

    adminSetupMutation.mutate({
      username: setupData.adminUsername,
      password: setupData.adminPassword,
      email: setupData.adminEmail,
      firstName: setupData.adminFirstName || 'System',
      lastName: setupData.adminLastName || 'Administrator',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading setup status...</span>
        </div>
      </div>
    );
  }

  if (setupStatus?.setupCompleted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <CardTitle className="text-2xl">Setup Complete!</CardTitle>
            <CardDescription>
              Your application is already configured and ready to use.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              Redirecting to dashboard...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex justify-center mb-6">
              <div className="bg-white dark:bg-gray-800 rounded-full p-4 shadow-lg">
                <Settings className="h-12 w-12 text-blue-600" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              LaptopPOS Setup Wizard
            </h1>
            <p className="text-xl text-muted-foreground">
              Welcome! Let's set up your point-of-sale system in a few simple steps.
            </p>
          </div>

          {/* Progress Steps */}
          <div className="flex justify-center mb-12">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                {currentStep > 1 ? (
                  <CheckCircle className="h-8 w-8 text-green-600" />
                ) : currentStep === 1 ? (
                  <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold">1</span>
                  </div>
                ) : (
                  <Circle className="h-8 w-8 text-gray-400" />
                )}
                <span className="ml-2 font-medium text-gray-900 dark:text-white">Database</span>
              </div>
              
              <ArrowRight className="h-4 w-4 text-gray-400" />
              
              <div className="flex items-center">
                {currentStep > 2 ? (
                  <CheckCircle className="h-8 w-8 text-green-600" />
                ) : currentStep === 2 ? (
                  <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold">2</span>
                  </div>
                ) : (
                  <Circle className="h-8 w-8 text-gray-400" />
                )}
                <span className="ml-2 font-medium text-gray-900 dark:text-white">Store</span>
              </div>
              
              <ArrowRight className="h-4 w-4 text-gray-400" />
              
              <div className="flex items-center">
                {currentStep > 3 ? (
                  <CheckCircle className="h-8 w-8 text-green-600" />
                ) : currentStep === 3 ? (
                  <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold">3</span>
                  </div>
                ) : (
                  <Circle className="h-8 w-8 text-gray-400" />
                )}
                <span className="ml-2 font-medium text-gray-900 dark:text-white">Admin</span>
              </div>
              
              <ArrowRight className="h-4 w-4 text-gray-400" />
              
              <div className="flex items-center">
                {currentStep === 4 ? (
                  <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold">4</span>
                  </div>
                ) : (
                  <Circle className="h-8 w-8 text-gray-400" />
                )}
                <span className="ml-2 font-medium text-gray-900 dark:text-white">Complete</span>
              </div>
            </div>
          </div>

          {/* Step Content */}
          <Card className="max-w-2xl mx-auto">
            {currentStep === 1 && (
              <>
                <CardHeader>
                  <div className="flex items-center">
                    <Database className="h-6 w-6 text-blue-600 mr-2" />
                    <CardTitle>Database Migration</CardTitle>
                  </div>
                  <CardDescription>
                    Initialize your database tables and structure
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="text-center py-8">
                    <Database className="h-16 w-16 text-blue-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Ready to Setup Database</h3>
                    <p className="text-muted-foreground mb-6">
                      Click the button below to automatically migrate your database schema. 
                      This will create all necessary tables and indexes for your application.
                    </p>
                    
                    {databaseMigrationMutation.isPending && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-6">
                        <div className="flex items-center justify-center space-x-2 text-blue-700 dark:text-blue-300">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span>Migrating database schema...</span>
                        </div>
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                          This may take up to 1 minute. Please wait...
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <Button 
                      onClick={() => databaseMigrationMutation.mutate()}
                      disabled={databaseMigrationMutation.isPending}
                      data-testid="button-migrate-database"
                    >
                      {databaseMigrationMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Migrating...
                        </>
                      ) : (
                        <>
                          Migrate Database
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </>
            )}

            {currentStep === 2 && (
              <>
                <CardHeader>
                  <div className="flex items-center">
                    <Store className="h-6 w-6 text-blue-600 mr-2" />
                    <CardTitle>Store Configuration</CardTitle>
                  </div>
                  <CardDescription>
                    Enter your store information to get started
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="storeName">Store Name *</Label>
                      <Input
                        id="storeName"
                        placeholder="My LaptopPOS Store"
                        value={setupData.storeName}
                        onChange={(e) => setSetupData(prev => ({ ...prev, storeName: e.target.value }))}
                        data-testid="input-store-name"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="storeAddress">Store Address</Label>
                      <Input
                        id="storeAddress"
                        placeholder="123 Main Street, City, State"
                        value={setupData.storeAddress}
                        onChange={(e) => setSetupData(prev => ({ ...prev, storeAddress: e.target.value }))}
                        data-testid="input-store-address"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="storePhone">Phone Number</Label>
                        <Input
                          id="storePhone"
                          placeholder="+62 123 456 7890"
                          value={setupData.storePhone}
                          onChange={(e) => setSetupData(prev => ({ ...prev, storePhone: e.target.value }))}
                          data-testid="input-store-phone"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="storeEmail">Store Email</Label>
                        <Input
                          id="storeEmail"
                          type="email"
                          placeholder="store@example.com"
                          value={setupData.storeEmail}
                          onChange={(e) => setSetupData(prev => ({ ...prev, storeEmail: e.target.value }))}
                          data-testid="input-store-email"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <Button 
                      variant="outline" 
                      onClick={() => setCurrentStep(1)}
                      data-testid="button-back-store"
                      disabled={storeSetupMutation.isPending}
                    >
                      Back
                    </Button>
                    <Button 
                      onClick={handleStoreSetup}
                      disabled={storeSetupMutation.isPending}
                      data-testid="button-continue-store"
                    >
                      {storeSetupMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Setting up...
                        </>
                      ) : (
                        <>
                          Continue
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </>
            )}

            {currentStep === 3 && (
              <>
                <CardHeader>
                  <div className="flex items-center">
                    <User className="h-6 w-6 text-blue-600 mr-2" />
                    <CardTitle>Create Admin User</CardTitle>
                  </div>
                  <CardDescription>
                    Create the first administrator account for your system
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="adminUsername">Username *</Label>
                      <Input
                        id="adminUsername"
                        placeholder="admin"
                        value={setupData.adminUsername}
                        onChange={(e) => setSetupData(prev => ({ ...prev, adminUsername: e.target.value }))}
                        data-testid="input-admin-username"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="adminPassword">Password *</Label>
                      <Input
                        id="adminPassword"
                        type="password"
                        placeholder="Enter a secure password"
                        value={setupData.adminPassword}
                        onChange={(e) => setSetupData(prev => ({ ...prev, adminPassword: e.target.value }))}
                        data-testid="input-admin-password"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="adminEmail">Email *</Label>
                      <Input
                        id="adminEmail"
                        type="email"
                        placeholder="admin@example.com"
                        value={setupData.adminEmail}
                        onChange={(e) => setSetupData(prev => ({ ...prev, adminEmail: e.target.value }))}
                        data-testid="input-admin-email"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="adminFirstName">First Name</Label>
                        <Input
                          id="adminFirstName"
                          placeholder="John"
                          value={setupData.adminFirstName}
                          onChange={(e) => setSetupData(prev => ({ ...prev, adminFirstName: e.target.value }))}
                          data-testid="input-admin-firstname"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="adminLastName">Last Name</Label>
                        <Input
                          id="adminLastName"
                          placeholder="Doe"
                          value={setupData.adminLastName}
                          onChange={(e) => setSetupData(prev => ({ ...prev, adminLastName: e.target.value }))}
                          data-testid="input-admin-lastname"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <Button 
                      variant="outline" 
                      onClick={() => setCurrentStep(2)}
                      data-testid="button-back-admin"
                    >
                      Back
                    </Button>
                    <Button 
                      onClick={handleAdminSetup}
                      disabled={adminSetupMutation.isPending}
                      data-testid="button-create-admin"
                    >
                      {adminSetupMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          Create Admin
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </>
            )}

            {currentStep === 4 && (
              <>
                <CardHeader>
                  <div className="flex items-center">
                    <CheckCircle className="h-6 w-6 text-green-600 mr-2" />
                    <CardTitle>Setup Complete</CardTitle>
                  </div>
                  <CardDescription>
                    Your LaptopPOS system is ready to use!
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg text-center">
                    <h3 className="font-semibold text-green-800 dark:text-green-200 mb-4 text-lg">
                      🎉 Setup Selesai!
                    </h3>
                    <p className="text-green-700 dark:text-green-300 text-sm mb-4">
                      Sistem LaptopPOS Anda sudah berhasil dikonfigurasi. Sekarang Anda bisa login dan mulai mengelola bisnis.
                    </p>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border-2 border-green-200 dark:border-green-700">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Klik tombol "Complete Setup" di bawah untuk menyelesaikan instalasi
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Anda akan diarahkan ke halaman login setelah setup selesai
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">What's next?</h4>
                    <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                      <li>Add products and categories to your inventory</li>
                      <li>Configure additional user roles and permissions</li>
                      <li>Set up WhatsApp integration for notifications</li>
                      <li>Start processing sales and service tickets</li>
                    </ul>
                  </div>

                  <div className="flex justify-between">
                    <Button 
                      variant="outline" 
                      onClick={() => setCurrentStep(3)}
                      data-testid="button-back-complete"
                    >
                      Back
                    </Button>
                    <Button 
                      size="lg"
                      className="px-8 py-3 text-lg font-semibold bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => completeSetupMutation.mutate()}
                      disabled={completeSetupMutation.isPending}
                      data-testid="button-complete-setup"
                    >
                      {completeSetupMutation.isPending ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          Menyelesaikan Setup...
                        </>
                      ) : (
                        <>
                          ✅ Complete Setup
                          <CheckCircle className="h-5 w-5 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}