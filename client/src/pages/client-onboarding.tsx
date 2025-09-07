import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { 
  CheckCircle, 
  Circle, 
  Store, 
  User, 
  Settings, 
  ArrowRight, 
  Loader2,
  Rocket,
  Users,
  Building2
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface OnboardingStatus {
  completed: boolean;
  currentStep: number;
  clientInfo?: {
    name: string;
    subdomain: string;
    planName: string;
    trialEndsAt: string;
  };
}

export default function ClientOnboarding() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [onboardingData, setOnboardingData] = useState({
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

  // Check onboarding status
  const { data: onboardingStatus, isLoading } = useQuery<OnboardingStatus>({
    queryKey: ['/api/client/onboarding/status'],
    refetchInterval: false,
  });

  useEffect(() => {
    // Redirect if onboarding is already completed
    if (onboardingStatus?.completed) {
      toast({
        title: "Setup Selesai",
        description: "Aplikasi sudah siap digunakan. Mengarahkan ke dashboard...",
      });
      setTimeout(() => setLocation('/dashboard'), 2000);
    }
  }, [onboardingStatus, setLocation, toast]);

  // Store setup mutation
  const storeSetupMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/client/onboarding/store', data);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Konfigurasi Toko Berhasil",
        description: "Informasi toko telah disimpan",
      });
      setCurrentStep(2);
    },
    onError: (error: any) => {
      toast({
        title: "Gagal Menyimpan Konfigurasi Toko",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Admin user creation mutation
  const adminSetupMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/client/onboarding/admin', data);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Admin User Berhasil Dibuat",
        description: "Account administrator telah dibuat",
      });
      setCurrentStep(3);
    },
    onError: (error: any) => {
      toast({
        title: "Gagal Membuat Admin User",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Complete onboarding mutation
  const completeOnboardingMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/client/onboarding/complete', {});
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Onboarding Selesai!",
        description: "Selamat datang di LaptopPOS! Aplikasi siap digunakan.",
      });
      setTimeout(() => setLocation('/dashboard'), 2000);
    },
    onError: (error: any) => {
      toast({
        title: "Gagal Menyelesaikan Onboarding",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleStoreSetup = () => {
    const { storeName, storeAddress, storePhone, storeEmail } = onboardingData;
    
    if (!storeName) {
      toast({
        title: "Data Tidak Lengkap",
        description: "Nama toko harus diisi",
        variant: "destructive",
      });
      return;
    }

    storeSetupMutation.mutate({
      name: storeName,
      address: storeAddress,
      phone: storePhone,
      email: storeEmail,
    });
  };

  const handleAdminSetup = () => {
    const { adminUsername, adminPassword, adminEmail, adminFirstName, adminLastName } = onboardingData;
    
    if (!adminUsername || !adminPassword || !adminEmail) {
      toast({
        title: "Data Tidak Lengkap",
        description: "Username, password, dan email harus diisi",
        variant: "destructive",
      });
      return;
    }

    adminSetupMutation.mutate({
      username: adminUsername,
      password: adminPassword,
      email: adminEmail,
      firstName: adminFirstName,
      lastName: adminLastName,
    });
  };

  const getStepIcon = (step: number, currentStep: number) => {
    if (step < currentStep) {
      return <CheckCircle className="h-6 w-6 text-green-500" />;
    } else if (step === currentStep) {
      return <Circle className="h-6 w-6 text-blue-500 fill-blue-500" />;
    } else {
      return <Circle className="h-6 w-6 text-gray-300" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Memuat status onboarding...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Rocket className="h-8 w-8 text-blue-600 mr-2" />
            <h1 className="text-3xl font-bold text-gray-900">Selamat Datang!</h1>
          </div>
          <p className="text-gray-600 text-lg">
            Mari siapkan aplikasi LaptopPOS untuk {onboardingStatus?.clientInfo?.name}
          </p>
          {onboardingStatus?.clientInfo && (
            <div className="mt-4 flex items-center justify-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                {onboardingStatus.clientInfo.subdomain}.yourdomain.com
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Rocket className="h-4 w-4" />
                {onboardingStatus.clientInfo.planName}
              </span>
              <span>•</span>
              <span>
                Trial hingga {new Date(onboardingStatus.clientInfo.trialEndsAt).toLocaleDateString('id-ID')}
              </span>
            </div>
          )}
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-8">
            <div className="flex items-center">
              {getStepIcon(1, currentStep)}
              <span className={`ml-2 text-sm font-medium ${currentStep >= 1 ? 'text-gray-900' : 'text-gray-400'}`}>
                Konfigurasi Toko
              </span>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400" />
            <div className="flex items-center">
              {getStepIcon(2, currentStep)}
              <span className={`ml-2 text-sm font-medium ${currentStep >= 2 ? 'text-gray-900' : 'text-gray-400'}`}>
                Admin User
              </span>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400" />
            <div className="flex items-center">
              {getStepIcon(3, currentStep)}
              <span className={`ml-2 text-sm font-medium ${currentStep >= 3 ? 'text-gray-900' : 'text-gray-400'}`}>
                Selesai
              </span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <Progress value={(currentStep / 3) * 100} className="h-2" />
        </div>

        {/* Step Content */}
        <div className="space-y-6">
          {currentStep === 1 && (
            <Card className="shadow-lg">
              <CardHeader className="text-center">
                <div className="flex items-center justify-center mb-4">
                  <Store className="h-8 w-8 text-blue-600" />
                </div>
                <CardTitle>Konfigurasi Toko</CardTitle>
                <CardDescription>
                  Atur informasi dasar toko Anda
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="store-name">Nama Toko *</Label>
                    <Input
                      id="store-name"
                      data-testid="input-store-name"
                      value={onboardingData.storeName}
                      onChange={(e) => setOnboardingData(prev => ({ ...prev, storeName: e.target.value }))}
                      placeholder="Nama toko Anda"
                    />
                  </div>
                  <div>
                    <Label htmlFor="store-email">Email Toko</Label>
                    <Input
                      id="store-email"
                      data-testid="input-store-email"
                      type="email"
                      value={onboardingData.storeEmail}
                      onChange={(e) => setOnboardingData(prev => ({ ...prev, storeEmail: e.target.value }))}
                      placeholder="email@toko.com"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="store-address">Alamat Toko</Label>
                  <Input
                    id="store-address"
                    data-testid="input-store-address"
                    value={onboardingData.storeAddress}
                    onChange={(e) => setOnboardingData(prev => ({ ...prev, storeAddress: e.target.value }))}
                    placeholder="Alamat lengkap toko"
                  />
                </div>
                <div>
                  <Label htmlFor="store-phone">Nomor Telepon</Label>
                  <Input
                    id="store-phone"
                    data-testid="input-store-phone"
                    value={onboardingData.storePhone}
                    onChange={(e) => setOnboardingData(prev => ({ ...prev, storePhone: e.target.value }))}
                    placeholder="08123456789"
                  />
                </div>
                <Button 
                  data-testid="button-next-store"
                  onClick={handleStoreSetup}
                  disabled={storeSetupMutation.isPending}
                  className="w-full"
                >
                  {storeSetupMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      Lanjutkan
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {currentStep === 2 && (
            <Card className="shadow-lg">
              <CardHeader className="text-center">
                <div className="flex items-center justify-center mb-4">
                  <User className="h-8 w-8 text-blue-600" />
                </div>
                <CardTitle>Buat Admin User</CardTitle>
                <CardDescription>
                  Buat account administrator untuk mengelola sistem
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="admin-username">Username *</Label>
                    <Input
                      id="admin-username"
                      data-testid="input-admin-username"
                      value={onboardingData.adminUsername}
                      onChange={(e) => setOnboardingData(prev => ({ ...prev, adminUsername: e.target.value }))}
                      placeholder="admin"
                    />
                  </div>
                  <div>
                    <Label htmlFor="admin-email">Email *</Label>
                    <Input
                      id="admin-email"
                      data-testid="input-admin-email"
                      type="email"
                      value={onboardingData.adminEmail}
                      onChange={(e) => setOnboardingData(prev => ({ ...prev, adminEmail: e.target.value }))}
                      placeholder="admin@email.com"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="admin-password">Password *</Label>
                  <Input
                    id="admin-password"
                    data-testid="input-admin-password"
                    type="password"
                    value={onboardingData.adminPassword}
                    onChange={(e) => setOnboardingData(prev => ({ ...prev, adminPassword: e.target.value }))}
                    placeholder="Password yang kuat"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="admin-first-name">Nama Depan</Label>
                    <Input
                      id="admin-first-name"
                      data-testid="input-admin-first-name"
                      value={onboardingData.adminFirstName}
                      onChange={(e) => setOnboardingData(prev => ({ ...prev, adminFirstName: e.target.value }))}
                      placeholder="Nama depan"
                    />
                  </div>
                  <div>
                    <Label htmlFor="admin-last-name">Nama Belakang</Label>
                    <Input
                      id="admin-last-name"
                      data-testid="input-admin-last-name"
                      value={onboardingData.adminLastName}
                      onChange={(e) => setOnboardingData(prev => ({ ...prev, adminLastName: e.target.value }))}
                      placeholder="Nama belakang"
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => setCurrentStep(1)}
                    className="flex-1"
                  >
                    Kembali
                  </Button>
                  <Button 
                    data-testid="button-next-admin"
                    onClick={handleAdminSetup}
                    disabled={adminSetupMutation.isPending}
                    className="flex-1"
                  >
                    {adminSetupMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Membuat...
                      </>
                    ) : (
                      <>
                        Buat Admin
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 3 && (
            <Card className="shadow-lg">
              <CardHeader className="text-center">
                <div className="flex items-center justify-center mb-4">
                  <CheckCircle className="h-12 w-12 text-green-500" />
                </div>
                <CardTitle className="text-green-600">Setup Hampir Selesai!</CardTitle>
                <CardDescription>
                  Aplikasi LaptopPOS siap digunakan untuk {onboardingStatus?.clientInfo?.name}
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex flex-col items-center p-4 bg-green-50 rounded-lg">
                    <Store className="h-8 w-8 text-green-600 mb-2" />
                    <p className="font-medium">Toko Dikonfigurasi</p>
                    <p className="text-gray-600">Informasi toko tersimpan</p>
                  </div>
                  <div className="flex flex-col items-center p-4 bg-blue-50 rounded-lg">
                    <Users className="h-8 w-8 text-blue-600 mb-2" />
                    <p className="font-medium">Admin Dibuat</p>
                    <p className="text-gray-600">Account administrator siap</p>
                  </div>
                  <div className="flex flex-col items-center p-4 bg-purple-50 rounded-lg">
                    <Settings className="h-8 w-8 text-purple-600 mb-2" />
                    <p className="font-medium">Sistem Siap</p>
                    <p className="text-gray-600">Siap untuk digunakan</p>
                  </div>
                </div>
                
                <Button 
                  data-testid="button-complete-onboarding"
                  onClick={() => completeOnboardingMutation.mutate()}
                  disabled={completeOnboardingMutation.isPending}
                  size="lg"
                  className="w-full"
                >
                  {completeOnboardingMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Menyelesaikan Setup...
                    </>
                  ) : (
                    <>
                      <Rocket className="mr-2 h-4 w-4" />
                      Mulai Menggunakan LaptopPOS
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}