import { useState } from "react";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, User, Edit, Trash2, Phone, Mail, MapPin, Download, Upload, FileSpreadsheet } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCustomerSchema, type Customer } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { validateExcelFile, downloadTemplate, uploadExcelFile, type ImportResult } from "@/lib/importExportUtils";
import ImportResultsDialog from "@/components/ImportResultsDialog";

const customerFormSchema = insertCustomerSchema;

export default function Customers() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  
  // Import/Export state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showImportResults, setShowImportResults] = useState(false);
  const [importResults, setImportResults] = useState<ImportResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["/api/customers", searchQuery],
    queryFn: async () => {
      const url = searchQuery ? `/api/customers?search=${encodeURIComponent(searchQuery)}` : '/api/customers';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch customers');
      return response.json();
    },
    retry: false,
  });

  const form = useForm({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
      // Add additional fields that might be in schema
      paymentTerms: 30,
      creditLimit: "",
      rating: 5,
    },
    mode: "onChange", // Enable real-time validation
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', '/api/customers', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setShowDialog(false);
      setEditingCustomer(null);
      form.reset();
      toast({ title: "Berhasil", description: "Pelanggan berhasil dibuat" });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Tidak Diotorisasi",
          description: "Anda telah logout. Masuk kembali...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({ title: "Error", description: "Gagal membuat pelanggan", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return apiRequest('PUT', `/api/customers/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setShowDialog(false);
      setEditingCustomer(null);
      form.reset();
      toast({ title: "Berhasil", description: "Pelanggan berhasil diupdate" });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Tidak Diotorisasi",
          description: "Anda telah logout. Masuk kembali...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({ title: "Error", description: "Gagal mengupdate pelanggan", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/customers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({ title: "Success", description: "Customer deleted successfully" });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Tidak Diotorisasi",
          description: "Anda telah logout. Masuk kembali...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({ title: "Error", description: "Failed to delete customer", variant: "destructive" });
    },
  });

  const handleSubmit = (data: any) => {
    console.log("🔥 Customer handleSubmit called with data:", data);
    console.log("🔥 Customer Form errors:", form.formState.errors);
    console.log("🔥 Customer Form is valid:", form.formState.isValid);
    console.log("🔥 Customer Create mutation pending:", createMutation.isPending);
    console.log("🔥 Customer Update mutation pending:", updateMutation.isPending);
    
    if (editingCustomer) {
      updateMutation.mutate({ id: editingCustomer.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    form.reset({
      name: customer.name,
      email: customer.email || "",
      phone: customer.phone || "",
      address: customer.address || "",
    });
    setShowDialog(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this customer?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleNew = () => {
    setEditingCustomer(null);
    form.reset();
    setShowDialog(true);
  };

  // Import/Export handlers
  const handleDownloadTemplate = async () => {
    try {
      setIsDownloading(true);
      await downloadTemplate('/api/customers/template', 'customer-template.xlsx');
      toast({ 
        title: "Success", 
        description: "Template downloaded successfully" 
      });
    } catch (error) {
      console.error('Download template error:', error);
      toast({ 
        title: "Error", 
        description: "Failed to download template", 
        variant: "destructive" 
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = validateExcelFile(file);
    if (!validation.isValid) {
      toast({ 
        title: "Invalid File", 
        description: validation.error, 
        variant: "destructive" 
      });
      return;
    }

    setSelectedFile(file);
  };

  const handleImportExcel = async () => {
    if (!selectedFile) {
      toast({ 
        title: "No File Selected", 
        description: "Please select an Excel file to import", 
        variant: "destructive" 
      });
      return;
    }

    try {
      setIsUploading(true);
      const result = await uploadExcelFile(selectedFile, '/api/customers/import');
      setImportResults(result);
      setShowImportResults(true);
      setSelectedFile(null);
      
      // Clear the file input
      const fileInput = document.getElementById('customer-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      // Refresh customers data
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      
      if (result.successCount > 0) {
        toast({ 
          title: "Import Completed", 
          description: `Successfully imported ${result.successCount} customers` 
        });
      }
    } catch (error) {
      console.error('Import error:', error);
      toast({ 
        title: "Import Failed", 
        description: error instanceof Error ? error.message : "Failed to import file", 
        variant: "destructive" 
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Manajemen Pelanggan" 
          breadcrumb="Beranda / Pelanggan"
          action={
            <div className="flex items-center space-x-2">
              {/* Import/Export Buttons */}
              <Button 
                variant="outline" 
                onClick={handleDownloadTemplate}
                disabled={isDownloading}
                data-testid="button-download-customer-template"
              >
                {isDownloading ? (
                  <FileSpreadsheet className="w-4 h-4 mr-2 animate-pulse" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                {isDownloading ? "Downloading..." : "Download Template"}
              </Button>
              
              <div className="flex items-center space-x-2">
                <input
                  id="customer-file-input"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                  data-testid="input-customer-file"
                />
                <Button 
                  variant="outline"
                  onClick={() => document.getElementById('customer-file-input')?.click()}
                  data-testid="button-select-customer-file"
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Select File
                </Button>
                
                {selectedFile && (
                  <Button 
                    onClick={handleImportExcel}
                    disabled={isUploading}
                    data-testid="button-import-customers"
                  >
                    {isUploading ? (
                      <Upload className="w-4 h-4 mr-2 animate-pulse" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    {isUploading ? "Importing..." : "Import Excel"}
                  </Button>
                )}
              </div>
              
              <Button onClick={handleNew} data-testid="button-add-customer">
                <Plus className="w-4 h-4 mr-2" />
                Tambah Pelanggan
              </Button>
            </div>
          }
        />
        <main className="flex-1 overflow-y-auto p-6">
          {/* Search Bar */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex space-x-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search customers by name, email, or phone..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    data-testid="input-customer-search"
                  />
                </div>
                {selectedFile && (
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <FileSpreadsheet className="w-4 h-4" />
                    <span data-testid="selected-file-name">{selectedFile.name}</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        setSelectedFile(null);
                        const fileInput = document.getElementById('customer-file-input') as HTMLInputElement;
                        if (fileInput) fileInput.value = '';
                      }}
                      data-testid="button-clear-selected-file"
                    >
                      ×
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Customers Table */}
          <Card>
            <CardHeader>
              <CardTitle>Customers ({(customers as Customer[]).length})</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              ) : (customers as Customer[]).length === 0 ? (
                <div className="text-center py-8">
                  <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No customers found</p>
                  <Button className="mt-4" onClick={handleNew}>
                    Add First Customer
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Contact Information</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(customers as Customer[]).map((customer: Customer) => (
                      <TableRow key={customer.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                              <User className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium" data-testid={`customer-name-${customer.id}`}>
                                {customer.name}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {customer.email && (
                              <div className="flex items-center text-sm">
                                <Mail className="w-4 h-4 mr-2 text-muted-foreground" />
                                <span data-testid={`customer-email-${customer.id}`}>
                                  {customer.email}
                                </span>
                              </div>
                            )}
                            {customer.phone && (
                              <div className="flex items-center text-sm">
                                <Phone className="w-4 h-4 mr-2 text-muted-foreground" />
                                <span data-testid={`customer-phone-${customer.id}`}>
                                  {customer.phone}
                                </span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {customer.address && (
                            <div className="flex items-center text-sm">
                              <MapPin className="w-4 h-4 mr-2 text-muted-foreground" />
                              <span className="text-muted-foreground truncate max-w-xs" data-testid={`customer-address-${customer.id}`}>
                                {customer.address}
                              </span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground" data-testid={`customer-joined-${customer.id}`}>
                            {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString('id-ID') : '-'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(customer)}
                              data-testid={`button-edit-customer-${customer.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(customer.id)}
                              data-testid={`button-delete-customer-${customer.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Customer Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingCustomer ? "Edit Customer" : "Add New Customer"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter customer name" {...field} data-testid="input-customer-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="customer@example.com" 
                          {...field} 
                          data-testid="input-customer-email" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="08123456789" 
                          {...field} 
                          data-testid="input-customer-phone" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Customer address" 
                        {...field} 
                        data-testid="textarea-customer-address" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-3 pt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowDialog(false)}
                  data-testid="button-cancel-customer"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-customer"
                  onClick={(e) => {
                    console.log("🔥 Customer Button clicked!");
                    console.log("🔥 Customer Form state:", form.formState);
                    console.log("🔥 Customer Form values:", form.getValues());
                    console.log("🔥 Customer Form errors:", form.formState.errors);
                    console.log("🔥 Customer Form is valid:", form.formState.isValid);
                  }}
                >
                  {editingCustomer ? "Update Customer" : "Create Customer"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Import Results Dialog */}
      <ImportResultsDialog
        open={showImportResults}
        onOpenChange={setShowImportResults}
        result={importResults}
        title="Customer Import Results"
      />
    </div>
  );
}