import { useState } from "react";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Laptop, Edit, Trash2, Clock, AlertCircle, CheckCircle, Calendar, User, Package, Settings, Wrench, Receipt, TestTube, FileText, CreditCard } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { serviceTickets, type ServiceTicket, type Customer } from "@shared/schema";
import { formatDateShort, formatDateLong, formatDateForDatabase, getCurrentJakartaTime, createDatabaseTimestamp } from '@shared/utils/timezone';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { ServicePartsSelector } from "@/components/service-parts-selector";
import ServiceReceipt from "@/components/ServiceReceipt";
import ServiceReceiptNew from "@/components/ServiceReceiptNew";
import ServicePaymentReceipt from "@/components/ServicePaymentReceipt";
import ServiceStatusTracker from "@/components/ServiceStatusTracker";
import CustomerCreateModal from "@/components/customers/customer-create-modal";

const serviceTicketFormSchema = createInsertSchema(serviceTickets).omit({
  id: true,
  ticketNumber: true,
  createdAt: true,
  updatedAt: true,
  estimatedCost: true,
  actualCost: true,
  partsCost: true,
  completedAt: true,
  estimatedCompletion: true,
  warrantyStartDate: true,
  warrantyEndDate: true,
}).extend({
  estimatedCost: z.string().optional(),
  laborCost: z.string().optional(),
  warrantyDuration: z.union([z.string(), z.number()]).optional().transform((val) => {
    if (val === "" || val === undefined || val === null) return undefined;
    return typeof val === "string" ? (val === "" ? undefined : parseInt(val) || 0) : val;
  }),
}).refine((data) => {
  return data.customerId && data.customerId.trim() !== "";
}, {
  message: "Customer harus dipilih",
  path: ["customerId"]
}).refine((data) => {
  return data.deviceType && data.deviceType.trim() !== "";
}, {
  message: "Jenis perangkat harus diisi",
  path: ["deviceType"]
}).refine((data) => {
  return data.problem && data.problem.trim() !== "";
}, {
  message: "Deskripsi masalah harus diisi",
  path: ["problem"]
});

interface ServicePart {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  stock: number;
}

type ServiceTicketStatus = "pending" | "checking" | "in-progress" | "waiting-technician" | "testing" | "waiting-confirmation" | "waiting-parts" | "completed" | "delivered" | "cancelled";

const statusColors = {
  pending: { bg: "bg-yellow-100", text: "text-yellow-800", icon: Clock },
  checking: { bg: "bg-sky-100", text: "text-sky-800", icon: AlertCircle },
  "in-progress": { bg: "bg-blue-100", text: "text-blue-800", icon: Settings },
  "waiting-technician": { bg: "bg-gray-100", text: "text-gray-800", icon: AlertCircle },
  testing: { bg: "bg-indigo-100", text: "text-indigo-800", icon: TestTube },
  "waiting-confirmation": { bg: "bg-red-100", text: "text-red-800", icon: FileText },
  "waiting-parts": { bg: "bg-orange-100", text: "text-orange-800", icon: Package },
  completed: { bg: "bg-green-100", text: "text-green-800", icon: CheckCircle },
  delivered: { bg: "bg-purple-100", text: "text-purple-800", icon: CheckCircle },
  cancelled: { bg: "bg-red-100", text: "text-red-800", icon: AlertCircle },
};

const statusLabels = {
  pending: "Belum Cek",
  checking: "Sedang Cek", 
  "in-progress": "Sedang Dikerjakan",
  "waiting-technician": "Ditunggu MITRA Teknik",
  testing: "Sedang Tes",
  "waiting-confirmation": "Menunggu Konfirmasi",
  "waiting-parts": "Menunggu Sparepart",
  completed: "Selesai",
  delivered: "Sudah Diambil",
  cancelled: "Dibatalkan",
};


export default function ServiceTickets() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ServiceTicketStatus | "all">("all");
  const [showDialog, setShowDialog] = useState(false);
  const [editingTicket, setEditingTicket] = useState<ServiceTicket | null>(null);
  const [selectedParts, setSelectedParts] = useState<ServicePart[]>([]);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<ServiceTicket | null>(null);
  const [receiptCustomerData, setReceiptCustomerData] = useState<Customer | null>(null);
  const [showPaymentReceipt, setShowPaymentReceipt] = useState(false);
  const [paymentReceiptData, setPaymentReceiptData] = useState<ServiceTicket | null>(null);
  const [showStatusTracker, setShowStatusTracker] = useState(false);
  const [statusTrackerData, setStatusTrackerData] = useState<ServiceTicket | null>(null);
  const [showCustomerCreateModal, setShowCustomerCreateModal] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["/api/service-tickets"],
    retry: false,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["/api/customers"],
    retry: false,
  });

  const { data: storeConfig = {} } = useQuery({
    queryKey: ['/api/store-config'],
    queryFn: async () => {
      const response = await fetch('/api/store-config', { credentials: 'include' });
      if (!response.ok) return { name: 'LaptopPOS' };
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 menit
    refetchInterval: false,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
    retry: false,
  });

  const form = useForm({
    resolver: zodResolver(serviceTicketFormSchema),
    defaultValues: {
      customerId: "",
      deviceType: "",
      deviceBrand: "",
      deviceModel: "",
      serialNumber: "",
      completeness: "",
      problem: "",
      diagnosis: "",
      solution: "",
      status: "pending",
      estimatedCost: "",
      laborCost: "",
      warrantyDuration: "",
    },
    mode: "onChange", // Enable real-time validation
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const ticketData = {
        ...data,
        estimatedCost: data.estimatedCost ? parseFloat(data.estimatedCost) : null,
      };
      return apiRequest('POST', '/api/service-tickets', ticketData);
    },
    onSuccess: (createdTicket, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-tickets"] });
      setShowDialog(false);
      setEditingTicket(null);
      setSelectedParts([]);
      
      // Ambil data customer dari form saat ini
      const selectedCustomerId = variables.customerId;
      const selectedCustomer = (customers as Customer[])?.find(c => c.id === selectedCustomerId);
      
      form.reset({
        customerId: "",
        deviceType: "",
        deviceBrand: "",
        deviceModel: "",
        serialNumber: "",
        completeness: "",
        problem: "",
        diagnosis: "",
        solution: "",
        status: "pending",
        estimatedCost: "",
        laborCost: "",
      });
      
      // Show success toast
      toast({ title: "Sukses", description: "Tiket servis berhasil dibuat" });
      
      // Auto-open print receipt popup dengan data lengkap dari form yang baru disubmit
      if (createdTicket && selectedCustomer) {
        // Gunakan data asli dari form yang baru disubmit (variables berisi data yang persis dikirim ke API)
        const completeTicketData = {
          ...(createdTicket as any),
          // Override dengan data dari variables (form input) untuk memastikan data terbaru
          deviceType: variables.deviceType,
          deviceBrand: variables.deviceBrand,
          deviceModel: variables.deviceModel,
          serialNumber: variables.serialNumber,
          completeness: variables.completeness,
          problem: variables.problem,
          diagnosis: variables.diagnosis,
          solution: variables.solution
        };
        
        console.log('Complete ticket data for receipt:', completeTicketData);
        
        // Set data lengkap langsung tanpa menunggu query update
        setReceiptData(completeTicketData as any);
        setReceiptCustomerData(selectedCustomer);
        setShowReceipt(true);
      }
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({ title: "Error", description: "Gagal membuat tiket servis", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      console.log("Raw update body:", JSON.stringify(data, null, 2));
      
      const { parts, ...ticketData } = data;
      console.log("Processed update data:", JSON.stringify(ticketData, null, 2));
      
      return apiRequest('PUT', `/api/service-tickets/${id}`, { ...ticketData, parts });
    },
    onSuccess: (updatedTicket, variables) => {
      // Update specific item in cache immediately
      queryClient.setQueryData(["/api/service-tickets"], (oldData: any) => {
        if (!oldData) return oldData;
        return oldData.map((ticket: any) => 
          ticket.id === variables.id ? { ...ticket, ...updatedTicket } : ticket
        );
      });
      
      // Then invalidate to refresh from server
      queryClient.invalidateQueries({ queryKey: ["/api/service-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      
      setShowDialog(false);
      setEditingTicket(null);
      setSelectedParts([]);
      form.reset({
        customerId: "",
        deviceType: "",
        deviceBrand: "",
        deviceModel: "",
        serialNumber: "",
        completeness: "",
        problem: "",
        diagnosis: "",
        solution: "",
        status: "pending",
        estimatedCost: "",
        laborCost: "",
      });
      toast({ title: "Sukses", description: "Tiket servis berhasil diperbarui" });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({ title: "Error", description: "Gagal memperbarui tiket servis", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/service-tickets/${id}`);
    },
    onSuccess: (_, deletedId) => {
      // Remove item from cache immediately (optimistic update)
      queryClient.setQueryData(["/api/service-tickets"], (oldData: any) => {
        if (!oldData) return oldData;
        return oldData.filter((ticket: any) => ticket.id !== deletedId);
      });
      
      // Then invalidate to refresh from server
      queryClient.invalidateQueries({ queryKey: ["/api/service-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      
      // Close modal if it was open
      setEditingTicket(null);
      setShowDialog(false);
      
      toast({ title: "Sukses", description: "Tiket servis berhasil dihapus" });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({ title: "Error", description: "Gagal menghapus tiket servis", variant: "destructive" });
    },
  });

  const handleCustomerCreated = (newCustomer: any) => {
    // Select the newly created customer
    form.setValue("customerId", newCustomer.id);
  };

  const handleSubmit = (data: any) => {
    // Validate required fields
    if (!data.customerId || data.customerId.trim() === "") {
      toast({
        title: "Error",
        description: "Customer harus dipilih",
        variant: "destructive"
      });
      return;
    }
    
    if (!data.deviceType || data.deviceType.trim() === "") {
      toast({
        title: "Error", 
        description: "Jenis perangkat harus diisi",
        variant: "destructive"
      });
      return;
    }
    
    if (!data.problem || data.problem.trim() === "") {
      toast({
        title: "Error",
        description: "Deskripsi masalah harus diisi", 
        variant: "destructive"
      });
      return;
    }

    // Calculate warranty dates if status is delivered and warranty duration is provided
    let warrantyData = {};
    if (data.status === "delivered" && data.warrantyDuration) {
      const warrantyDurationNum = parseInt(data.warrantyDuration);
      if (warrantyDurationNum > 0) {
        const startDate = getCurrentJakartaTime();
        const endDate = warrantyDurationNum >= 9999 
          ? null // Unlimited warranty
          : new Date(startDate.getTime() + warrantyDurationNum * 24 * 60 * 60 * 1000);
        
        warrantyData = {
          warrantyDuration: warrantyDurationNum,
          warrantyStartDate: startDate.toISOString(),
          warrantyEndDate: endDate ? endDate.toISOString() : undefined
        };
      }
    }

    const submitData = {
      ...data,
      ...warrantyData,
      parts: selectedParts.map(part => ({
        productId: part.productId,
        quantity: part.quantity,
        unitPrice: part.unitPrice
      }))
    };
    
    if (editingTicket) {
      updateMutation.mutate({ id: editingTicket.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleEdit = (ticket: ServiceTicket) => {
    setEditingTicket(ticket);
    
    // Load existing parts for this ticket
    if (ticket.id) {
      fetch(`/api/service-tickets/${ticket.id}/parts`)
        .then(res => res.json())
        .then(parts => {
          const partsData = parts.map((part: any) => ({
            productId: part.productId,
            productName: part.productName,
            quantity: part.quantity,
            unitPrice: part.unitPrice,
            totalPrice: part.totalPrice,
            stock: 999 // Will be updated when component loads
          }));
          setSelectedParts(partsData);
        })
        .catch(console.error);
    }
    
    form.reset({
      customerId: ticket.customerId,
      deviceType: ticket.deviceType,
      deviceBrand: ticket.deviceBrand || "",
      deviceModel: ticket.deviceModel || "",
      serialNumber: ticket.serialNumber || "",
      completeness: ticket.completeness || "",
      problem: ticket.problem,
      diagnosis: ticket.diagnosis || "",
      solution: ticket.solution || "",
      status: ticket.status || "pending",
      estimatedCost: ticket.estimatedCost ? ticket.estimatedCost.toString() : "",
      laborCost: ticket.laborCost ? ticket.laborCost.toString() : "",
    });
    
    setShowDialog(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus tiket servis ini?")) {
      deleteMutation.mutate(id);
    }
  };

  const handlePrintReceipt = (ticket: ServiceTicket) => {
    // Cari data customer untuk tiket ini
    const customerForTicket = (customers as Customer[])?.find(c => c.id === ticket.customerId);
    
    setReceiptData(ticket);
    setReceiptCustomerData(customerForTicket || null);
    setShowReceipt(true);
  };

  const handlePrintPaymentReceipt = (ticket: ServiceTicket) => {
    setPaymentReceiptData(ticket);
    setShowPaymentReceipt(true);
  };

  const handleNew = () => {
    setEditingTicket(null);
    form.reset({
      customerId: "",
      deviceType: "",
      deviceBrand: "",
      deviceModel: "",
      serialNumber: "",
      completeness: "",
      problem: "",
      diagnosis: "",
      solution: "",
      status: "pending",
      estimatedCost: "",
      laborCost: "",
    });
    setSelectedParts([]);
    setShowDialog(true);
  };

  const filteredTickets = (tickets as ServiceTicket[])
    .filter((ticket) => {
      const matchesSearch = 
        ticket.deviceType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.problem.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ticket.deviceBrand && ticket.deviceBrand.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (ticket.deviceModel && ticket.deviceModel.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Tiket Service" 
          breadcrumb="Beranda / Service"
          action={
            <Button onClick={handleNew} data-testid="button-add-ticket">
              <Plus className="w-4 h-4 mr-2" />
              Tiket Baru
            </Button>
          }
        />
        <main className="flex-1 overflow-y-auto p-6">
          {/* Search and Filter Bar */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Cari berdasarkan perangkat atau masalah..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    data-testid="input-ticket-search"
                  />
                </div>
                <Select value={statusFilter} onValueChange={(value: ServiceTicketStatus | "all") => setStatusFilter(value)}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="pending">Belum Cek</SelectItem>
                    <SelectItem value="checking">Sedang Cek</SelectItem>
                    <SelectItem value="in-progress">Sedang Dikerjakan</SelectItem>
                    <SelectItem value="waiting-technician">Ditunggu MITRA Teknik</SelectItem>
                    <SelectItem value="testing">Sedang Tes</SelectItem>
                    <SelectItem value="waiting-confirmation">Menunggu Konfirmasi</SelectItem>
                    <SelectItem value="waiting-parts">Menunggu Sparepart</SelectItem>
                    <SelectItem value="completed">Selesai</SelectItem>
                    <SelectItem value="delivered">Sudah Diambil</SelectItem>
                    <SelectItem value="cancelled">Dibatalkan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Service Tickets Table */}
          <Card>
            <CardHeader>
              <CardTitle>Tiket Servis ({filteredTickets.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              ) : filteredTickets.length === 0 ? (
                <div className="text-center py-8">
                  <Laptop className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {searchQuery || statusFilter !== "all" ? "Tidak ada tiket yang cocok dengan pencarian" : "Belum ada tiket servis"}
                  </p>
                  <Button className="mt-4" onClick={handleNew}>
                    Buat Tiket Pertama
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ticket ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Perangkat</TableHead>
                      <TableHead>Masalah</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Estimasi Biaya</TableHead>
                      <TableHead>Tanggal</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTickets.map((ticket: ServiceTicket) => {
                      const customer = (customers as Customer[]).find(c => c.id === ticket.customerId);
                      const statusConfig = statusColors[ticket.status || 'pending'];
                      const StatusIcon = statusConfig.icon;

                      return (
                        <TableRow key={ticket.id}>
                          <TableCell>
                            <span className="font-mono text-sm" data-testid={`ticket-id-${ticket.id}`}>
                              #{ticket.id.slice(-8)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <User className="w-4 h-4 text-muted-foreground" />
                              <span data-testid={`ticket-customer-${ticket.id}`}>
                                {customer ? customer.name : "Unknown"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <span className="font-medium" data-testid={`ticket-device-${ticket.id}`}>
                                {ticket.deviceType}
                              </span>
                              {ticket.deviceBrand && (
                                <p className="text-xs text-muted-foreground">
                                  {ticket.deviceBrand} {ticket.deviceModel}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm truncate max-w-xs" data-testid={`ticket-problem-${ticket.id}`}>
                              {ticket.problem}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className={`flex items-center space-x-2 px-2 py-1 rounded-full ${statusConfig.bg} w-fit`}>
                              <StatusIcon className={`w-3 h-3 ${statusConfig.text}`} />
                              <span className={`text-xs font-medium ${statusConfig.text}`} data-testid={`ticket-status-${ticket.id}`}>
                                {statusLabels[ticket.status || 'pending']}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span data-testid={`ticket-cost-${ticket.id}`}>
                              {ticket.estimatedCost 
                                ? `Rp ${parseFloat(ticket.estimatedCost.toString()).toLocaleString("id-ID")}` 
                                : "-"
                              }
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center text-sm">
                              <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                              <span data-testid={`ticket-date-${ticket.id}`}>
                                {ticket.createdAt ? formatDateShort(ticket.createdAt) : '-'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setStatusTrackerData(ticket);
                                  setShowStatusTracker(true);
                                }}
                                data-testid={`button-status-${ticket.id}`}
                                title="Detail Status"
                              >
                                <Settings className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePrintReceipt(ticket)}
                                data-testid={`button-receipt-ticket-${ticket.id}`}
                                title="Cetak Nota Service"
                              >
                                <Receipt className="w-4 h-4" />
                              </Button>
                              {/* Payment Receipt Button - Only show for completed/delivered */}
                              {(ticket.status === 'completed' || ticket.status === 'delivered') && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handlePrintPaymentReceipt(ticket)}
                                  data-testid={`button-payment-receipt-${ticket.id}`}
                                  title="Nota Pembayaran"
                                >
                                  <CreditCard className="w-4 h-4" />
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(ticket)}
                                data-testid={`button-edit-ticket-${ticket.id}`}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(ticket.id)}
                                data-testid={`button-delete-ticket-${ticket.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Service Ticket Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTicket ? "Edit Tiket Servis" : "Buat Tiket Servis Baru"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <Tabs defaultValue="ticket-info" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="ticket-info" className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Informasi Servis
                  </TabsTrigger>
                  <TabsTrigger value="spare-parts" className="flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Spare Parts
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="ticket-info" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="customerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-customer">
                            <SelectValue placeholder="Pilih customer" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(customers as Customer[]).map((customer: Customer) => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="col-span-2">
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCustomerCreateModal(true)}
                      data-testid="button-create-customer"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Tambah Customer Baru
                    </Button>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="deviceType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jenis Perangkat *</FormLabel>
                      <FormControl>
                        <Input placeholder="Misal: Laptop, Tablet, HP" {...field} data-testid="input-device-type" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="deviceBrand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Brand</FormLabel>
                      <FormControl>
                        <Input placeholder="Misal: Dell, HP, Asus" {...field} data-testid="input-device-brand" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="deviceModel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Model</FormLabel>
                      <FormControl>
                        <Input placeholder="Misal: Latitude 7520" {...field} data-testid="input-device-model" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="serialNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Serial Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Masukkan serial number perangkat" {...field} data-testid="input-serial-number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="completeness"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kelengkapan</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Misal: Charger, Tas laptop, Mouse, dll..." 
                        {...field} 
                        data-testid="textarea-completeness" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="problem"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Masalah *</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Deskripsikan masalah perangkat..." 
                        {...field} 
                        data-testid="textarea-problem" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="diagnosis"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Diagnosis</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Hasil diagnosis teknisi..." 
                        {...field} 
                        data-testid="textarea-diagnosis" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="solution"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Solusi</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Tindakan yang dilakukan..." 
                        {...field} 
                        data-testid="textarea-solution" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-status">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pending">Belum Cek</SelectItem>
                          <SelectItem value="checking">Sedang Cek</SelectItem>
                          <SelectItem value="in-progress">Sedang Dikerjakan</SelectItem>
                          <SelectItem value="waiting-technician">Ditunggu MITRA Teknik</SelectItem>
                          <SelectItem value="testing">Sedang Tes</SelectItem>
                          <SelectItem value="waiting-confirmation">Menunggu Konfirmasi</SelectItem>
                          <SelectItem value="waiting-parts">Menunggu Sparepart</SelectItem>
                          <SelectItem value="completed">Selesai</SelectItem>
                          <SelectItem value="delivered">Sudah Diambil</SelectItem>
                          <SelectItem value="cancelled">Dibatalkan</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="laborCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Biaya Tenaga Kerja</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0" 
                          {...field} 
                          data-testid="input-labor-cost" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="estimatedCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimasi Biaya</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0" 
                          {...field} 
                          data-testid="input-estimated-cost" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Warranty Section - Only show when status is delivered */}
              {form.watch("status") === "delivered" && (
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg space-y-4">
                  <h3 className="text-lg font-semibold text-orange-800">Informasi Garansi</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="warrantyDuration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Lama Garansi (Hari) *</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="Masukkan lama garansi dalam hari" 
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : "")}
                              data-testid="input-warranty-duration" 
                            />
                          </FormControl>
                          <FormMessage />
                          <p className="text-sm text-muted-foreground">
                            Contoh: 30 = 30 hari, 365 = 1 tahun, 9999 = tanpa batas
                          </p>
                        </FormItem>
                      )}
                    />
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Info Garansi</label>
                      <div className="p-3 bg-white border rounded text-sm">
                        {form.watch("warrantyDuration") ? (
                          <div>
                            <p><strong>Durasi:</strong> {(() => {
                              const duration = parseInt(form.watch("warrantyDuration")) || 0;
                              if (duration >= 9999) return "Tanpa batas waktu";
                              if (duration === 1) return "1 hari";
                              if (duration < 30) return `${duration} hari`;
                              if (duration < 365) return `${Math.floor(duration / 30)} bulan ${duration % 30} hari`;
                              return `${Math.floor(duration / 365)} tahun ${Math.floor((duration % 365) / 30)} bulan`;
                            })()}</p>
                            {parseInt(form.watch("warrantyDuration")) < 9999 && (
                              <p><strong>Berakhir:</strong> {
                                formatDateLong(new Date(Date.now() + (parseInt(form.watch("warrantyDuration")) || 0) * 24 * 60 * 60 * 1000))
                              }</p>
                            )}
                          </div>
                        ) : (
                          <p className="text-muted-foreground">Masukkan durasi garansi</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
                </TabsContent>

                <TabsContent value="spare-parts" className="space-y-4">
                  <ServicePartsSelector
                    parts={selectedParts}
                    onPartsChange={setSelectedParts}
                    laborCost={parseFloat(form.watch("laborCost") || "0")}
                  />
                </TabsContent>
              </Tabs>

              <div className="flex justify-end space-x-3 pt-6 border-t">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowDialog(false)}
                  data-testid="button-cancel-ticket"
                >
                  Batal
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-ticket"
                >
                  {editingTicket ? "Perbarui Tiket" : "Buat Tiket"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Service Receipt Dialog */}
      <Dialog open={showReceipt} onOpenChange={(open) => {
        setShowReceipt(open);
        if (!open) {
          // Reset customer data ketika dialog ditutup
          setReceiptCustomerData(null);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Tanda Terima Service - {receiptData?.ticketNumber}
            </DialogTitle>
          </DialogHeader>
          {receiptData && (
            <ServiceReceiptNew
              serviceTicket={{
                ...receiptData,
                deviceBrand: receiptData.deviceBrand || undefined,
                deviceModel: receiptData.deviceModel || undefined,
                serialNumber: receiptData.serialNumber || undefined,
                completeness: receiptData.completeness || undefined,
                diagnosis: receiptData.diagnosis || undefined,
                solution: receiptData.solution || undefined,
                estimatedCost: receiptData.estimatedCost || undefined,
                status: receiptData.status || 'pending',
                technicianId: receiptData.technicianId || undefined,
                warrantyDuration: receiptData.warrantyDuration ?? undefined,
                warrantyStartDate: receiptData.warrantyStartDate ? (receiptData.warrantyStartDate instanceof Date ? receiptData.warrantyStartDate.toISOString() : receiptData.warrantyStartDate) : undefined,
                warrantyEndDate: receiptData.warrantyEndDate ? (receiptData.warrantyEndDate instanceof Date ? receiptData.warrantyEndDate.toISOString() : receiptData.warrantyEndDate) : undefined,
                createdAt: receiptData.createdAt ? (typeof receiptData.createdAt === 'string' ? receiptData.createdAt : receiptData.createdAt.toISOString()) : createDatabaseTimestamp()
              }}
              customer={(() => {
                // Gunakan data customer yang sudah disimpan saat membuat tiket
                if (receiptCustomerData) {
                  return {
                    id: receiptCustomerData.id,
                    name: receiptCustomerData.name,
                    phone: receiptCustomerData.phone || undefined,
                    email: receiptCustomerData.email || undefined,
                    address: receiptCustomerData.address || undefined
                  };
                }
                
                // Fallback: cari dari query cache
                const foundCustomer = (customers as Customer[])?.find((c: Customer) => c.id === receiptData.customerId);
                if (foundCustomer) {
                  return {
                    id: foundCustomer.id,
                    name: foundCustomer.name,
                    phone: foundCustomer.phone || undefined,
                    email: foundCustomer.email || undefined,
                    address: foundCustomer.address || undefined
                  };
                }
                
                // Last fallback
                return {
                  id: receiptData.customerId,
                  name: 'Customer Tidak Ditemukan',
                  phone: undefined,
                  email: undefined,
                  address: undefined
                };
              })()}
              storeConfig={storeConfig || {
                name: 'LaptopPOS Service',
                address: 'Alamat Toko',
                phone: '0123456789',
                email: 'info@laptoppos.com'
              }}
              technician={receiptData.technicianId ? (users as any[])?.find((u: any) => u.id === receiptData.technicianId) : null}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Service Payment Receipt Dialog */}
      {paymentReceiptData && (
        <ServicePaymentReceipt
          open={showPaymentReceipt}
          onClose={() => setShowPaymentReceipt(false)}
          serviceTicket={{
            ...paymentReceiptData,
            deviceBrand: paymentReceiptData.deviceBrand || undefined,
            deviceModel: paymentReceiptData.deviceModel || undefined,
            serialNumber: paymentReceiptData.serialNumber || undefined,
            diagnosis: paymentReceiptData.diagnosis || undefined,
            solution: paymentReceiptData.solution || undefined,
            actualCost: paymentReceiptData.actualCost || undefined,
            partsCost: paymentReceiptData.partsCost || undefined,
            laborCost: paymentReceiptData.laborCost || undefined,
            status: paymentReceiptData.status || 'pending',
            warrantyDuration: paymentReceiptData.warrantyDuration ?? undefined,
            warrantyStartDate: paymentReceiptData.warrantyStartDate ? (paymentReceiptData.warrantyStartDate instanceof Date ? paymentReceiptData.warrantyStartDate.toISOString() : paymentReceiptData.warrantyStartDate) : undefined,
            warrantyEndDate: paymentReceiptData.warrantyEndDate ? (paymentReceiptData.warrantyEndDate instanceof Date ? paymentReceiptData.warrantyEndDate.toISOString() : paymentReceiptData.warrantyEndDate) : undefined,
            createdAt: paymentReceiptData.createdAt ? (typeof paymentReceiptData.createdAt === 'string' ? paymentReceiptData.createdAt : paymentReceiptData.createdAt.toISOString()) : createDatabaseTimestamp(),
            completedAt: paymentReceiptData.completedAt ? (typeof paymentReceiptData.completedAt === 'string' ? paymentReceiptData.completedAt : paymentReceiptData.completedAt.toISOString()) : undefined
          }}
          customer={(() => {
            const foundCustomer = (customers as Customer[])?.find((c: Customer) => c.id === paymentReceiptData.customerId);
            return foundCustomer ? {
              ...foundCustomer,
              phone: foundCustomer.phone || undefined,
              email: foundCustomer.email || undefined,
              address: foundCustomer.address || undefined
            } : {
              id: paymentReceiptData.customerId,
              name: 'Customer',
              phone: undefined,
              email: undefined,
              address: undefined
            };
          })()}
          storeConfig={storeConfig || {
            name: 'LaptopPOS Service',
            address: 'Alamat Toko',
            phone: '0123456789',
            email: 'info@laptoppos.com'
          }}
          technician={paymentReceiptData.technicianId ? (users as any[])?.find((u: any) => u.id === paymentReceiptData.technicianId) : null}
        />
      )}

      {/* Service Status Tracker Dialog */}
      {statusTrackerData && (
        <ServiceStatusTracker
          isOpen={showStatusTracker}
          onClose={() => setShowStatusTracker(false)}
          serviceNumber={statusTrackerData.ticketNumber}
          currentStatus={statusTrackerData.status || 'pending'}
        />
      )}

      <CustomerCreateModal
        open={showCustomerCreateModal}
        onClose={() => setShowCustomerCreateModal(false)}
        onCustomerCreated={handleCustomerCreated}
      />
    </div>
  );
}