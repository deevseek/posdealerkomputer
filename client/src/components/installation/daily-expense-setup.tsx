import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { ExpenseCategory, DailyExpense } from "@shared/schema";

export default function DailyExpenseSetup() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const { data: categories = [] } = useQuery<ExpenseCategory[]>({
    queryKey: ["/api/expenses/categories"],
  });

  const { data: todayExpenses = [] } = useQuery<DailyExpense[]>({
    queryKey: ["/api/expenses/daily"],
  });

  const addExpenseMutation = useMutation({
    mutationFn: async (expense: any) => {
      return await apiRequest('POST', '/api/expenses/daily', expense);
    },
    onSuccess: () => {
      toast({
        title: "Expense Added",
        description: "Daily expense has been recorded successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses/daily"] });
      // Reset form
      setSelectedCategory("");
      setAmount("");
      setDescription("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add expense",
        variant: "destructive",
      });
    },
  });

  const handleAddExpense = () => {
    if (!selectedCategory || !amount || !description) {
      toast({
        title: "Validation Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    const expenseData = {
      categoryId: selectedCategory,
      amount: parseFloat(amount.replace(/[^\d]/g, '')),
      description,
      date: new Date(),
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      userId: "admin",
    };

    addExpenseMutation.mutate(expenseData);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const totalExpenses = todayExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  const getCategoryIcon = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.icon || "fas fa-receipt";
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.name || "Unknown";
  };

  const getCategoryColor = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    const colorMap: { [key: string]: string } = {
      red: "bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400",
      blue: "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400",
      green: "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400",
      purple: "bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400",
      yellow: "bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400",
      pink: "bg-pink-100 dark:bg-pink-900 text-pink-600 dark:text-pink-400",
      gray: "bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400",
      indigo: "bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400",
    };
    return colorMap[category?.color || 'gray'];
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
              <i className="fas fa-wallet text-orange-600 dark:text-orange-400"></i>
            </div>
            <div>
              <CardTitle className="text-lg">Daily Expense Tracking</CardTitle>
              <p className="text-sm text-muted-foreground">Comprehensive expense management system</p>
            </div>
          </div>
          <Badge variant="secondary" className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
            <i className="fas fa-check mr-1"></i>Installed
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        {/* Expense Categories */}
        <div className="mb-6">
          <h4 className="font-medium text-foreground mb-4">Kategori Pengeluaran</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map((category) => (
              <div key={category.id} className={`feature-card bg-${category.color}-50 dark:bg-${category.color}-950 border border-${category.color}-200 dark:border-${category.color}-800 rounded-lg p-4 text-center`}>
                <div className={`w-10 h-10 ${getCategoryColor(category.id)} rounded-full flex items-center justify-center mx-auto mb-2`}>
                  <i className={`${category.icon} text-sm`}></i>
                </div>
                <div className="font-medium text-foreground text-sm" data-testid={`category-${category.id}`}>
                  {category.name}
                </div>
                <div className="text-xs text-muted-foreground">{category.description}</div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Expense Entry Interface */}
        <div className="mb-6">
          <h5 className="font-medium text-foreground mb-3">Quick Expense Entry</h5>
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="category" className="text-sm font-medium text-foreground mb-2 block">
                    Kategori
                  </Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger data-testid="select-expense-category">
                      <SelectValue placeholder="Pilih kategori..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="amount" className="text-sm font-medium text-foreground mb-2 block">
                    Jumlah
                  </Label>
                  <Input 
                    id="amount"
                    type="text" 
                    placeholder="Rp 0" 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    data-testid="input-expense-amount"
                  />
                </div>
                
                <div>
                  <Label htmlFor="description" className="text-sm font-medium text-foreground mb-2 block">
                    Keterangan
                  </Label>
                  <Input 
                    id="description"
                    type="text" 
                    placeholder="Deskripsi pengeluaran..." 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    data-testid="input-expense-description"
                  />
                </div>
                
                <div className="flex items-end">
                  <Button 
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                    onClick={handleAddExpense}
                    disabled={addExpenseMutation.isPending}
                    data-testid="button-add-expense"
                  >
                    <i className="fas fa-plus mr-2"></i>
                    {addExpenseMutation.isPending ? "Adding..." : "Tambah"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Today's Expenses Summary */}
        <div>
          <h5 className="font-medium text-foreground mb-3">Pengeluaran Hari Ini</h5>
          <Card>
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">Total Pengeluaran Hari Ini</div>
                <div className="text-2xl font-bold text-foreground" data-testid="total-daily-expenses">
                  {formatCurrency(totalExpenses)}
                </div>
              </div>
            </div>
            
            <div className="divide-y divide-border">
              {todayExpenses.length > 0 ? (
                todayExpenses.map((expense) => (
                  <div key={expense.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 ${getCategoryColor(expense.categoryId)} rounded-full flex items-center justify-center`}>
                        <i className={`${getCategoryIcon(expense.categoryId)} text-sm`}></i>
                      </div>
                      <div>
                        <div className="font-medium text-foreground" data-testid={`expense-category-${expense.id}`}>
                          {getCategoryName(expense.categoryId)}
                        </div>
                        <div className="text-sm text-muted-foreground" data-testid={`expense-description-${expense.id}`}>
                          {expense.description}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-foreground" data-testid={`expense-amount-${expense.id}`}>
                        {formatCurrency(expense.amount)}
                      </div>
                      <div className="text-xs text-muted-foreground" data-testid={`expense-time-${expense.id}`}>
                        {expense.time}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <i className="fas fa-receipt text-4xl mb-4 opacity-30"></i>
                  <p>Belum ada pengeluaran hari ini</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}
