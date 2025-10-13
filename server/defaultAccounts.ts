// Standard Chart of Accounts untuk Indonesia
export const defaultAccounts = [
  // ASSETS (Aset) - Normal Balance: Debit
  { code: '1000', name: 'Aset', type: 'asset', subtype: 'asset_root', normalBalance: 'debit', description: 'Aset utama perusahaan' },
  
  // Current Assets (Aset Lancar)
  { code: '1100', name: 'Aset Lancar', type: 'asset', subtype: 'current_asset', normalBalance: 'debit', parentCode: '1000', description: 'Aset yang dapat dicairkan dalam 1 tahun' },
  { code: '1110', name: 'Kas dan Setara Kas', type: 'asset', subtype: 'cash', normalBalance: 'debit', parentCode: '1100', description: 'Kas di tangan dan bank' },
  { code: '1111', name: 'Kas', type: 'asset', subtype: 'cash', normalBalance: 'debit', parentCode: '1110', description: 'Uang tunai' },
  { code: '1112', name: 'Bank', type: 'asset', subtype: 'cash', normalBalance: 'debit', parentCode: '1110', description: 'Rekening bank' },
  { code: '1120', name: 'Piutang Usaha', type: 'asset', subtype: 'receivable', normalBalance: 'debit', parentCode: '1100', description: 'Tagihan kepada pelanggan' },
  { code: '1130', name: 'Persediaan', type: 'asset', subtype: 'inventory', normalBalance: 'debit', parentCode: '1100', description: 'Stok barang dagangan' },
  { code: '1140', name: 'Piutang Lainnya', type: 'asset', subtype: 'receivable', normalBalance: 'debit', parentCode: '1100', description: 'Piutang di luar usaha utama' },
  { code: '1150', name: 'Biaya Dibayar Dimuka', type: 'asset', subtype: 'prepaid', normalBalance: 'debit', parentCode: '1100', description: 'Biaya yang sudah dibayar untuk periode mendatang' },

  // Fixed Assets (Aset Tetap)
  { code: '1200', name: 'Aset Tetap', type: 'asset', subtype: 'fixed_asset', normalBalance: 'debit', parentCode: '1000', description: 'Aset jangka panjang untuk operasional' },
  { code: '1210', name: 'Peralatan', type: 'asset', subtype: 'fixed_asset', normalBalance: 'debit', parentCode: '1200', description: 'Peralatan kantor dan toko' },
  { code: '1220', name: 'Kendaraan', type: 'asset', subtype: 'fixed_asset', normalBalance: 'debit', parentCode: '1200', description: 'Kendaraan operasional' },
  { code: '1230', name: 'Furniture dan Fixtures', type: 'asset', subtype: 'fixed_asset', normalBalance: 'debit', parentCode: '1200', description: 'Mebel dan perlengkapan' },
  { code: '1240', name: 'Akumulasi Penyusutan - Peralatan', type: 'asset', subtype: 'accumulated_depreciation', normalBalance: 'credit', parentCode: '1200', description: 'Akumulasi penyusutan peralatan' },

  // LIABILITIES (Kewajiban) - Normal Balance: Credit
  { code: '2000', name: 'Kewajiban', type: 'liability', subtype: 'liability_root', normalBalance: 'credit', description: 'Kewajiban perusahaan' },
  
  // Current Liabilities (Kewajiban Lancar)
  { code: '2100', name: 'Kewajiban Lancar', type: 'liability', subtype: 'current_liability', normalBalance: 'credit', parentCode: '2000', description: 'Kewajiban jatuh tempo dalam 1 tahun' },
  { code: '2110', name: 'Hutang Usaha', type: 'liability', subtype: 'payable', normalBalance: 'credit', parentCode: '2100', description: 'Hutang kepada supplier' },
  { code: '2120', name: 'Hutang Pajak', type: 'liability', subtype: 'tax_payable', normalBalance: 'credit', parentCode: '2100', description: 'Hutang pajak yang belum dibayar' },
  { code: '2130', name: 'Hutang Gaji', type: 'liability', subtype: 'payable', normalBalance: 'credit', parentCode: '2100', description: 'Hutang gaji karyawan' },
  { code: '2140', name: 'Hutang Lainnya', type: 'liability', subtype: 'payable', normalBalance: 'credit', parentCode: '2100', description: 'Hutang di luar usaha utama' },

  // Long-term Liabilities (Kewajiban Jangka Panjang)
  { code: '2200', name: 'Kewajiban Jangka Panjang', type: 'liability', subtype: 'long_term_liability', normalBalance: 'credit', parentCode: '2000', description: 'Kewajiban jatuh tempo lebih dari 1 tahun' },
  { code: '2210', name: 'Hutang Bank', type: 'liability', subtype: 'loan', normalBalance: 'credit', parentCode: '2200', description: 'Pinjaman bank jangka panjang' },

  // EQUITY (Modal) - Normal Balance: Credit
  { code: '3000', name: 'Modal', type: 'equity', subtype: 'equity_root', normalBalance: 'credit', description: 'Modal pemilik' },
  { code: '3100', name: 'Modal Pemilik', type: 'equity', subtype: 'owner_equity', normalBalance: 'credit', parentCode: '3000', description: 'Modal yang disetorkan pemilik' },
  { code: '3200', name: 'Laba Ditahan', type: 'equity', subtype: 'retained_earnings', normalBalance: 'credit', parentCode: '3000', description: 'Akumulasi laba/rugi periode sebelumnya' },
  { code: '3300', name: 'Laba Rugi Tahun Berjalan', type: 'equity', subtype: 'current_earnings', normalBalance: 'credit', parentCode: '3000', description: 'Laba/rugi periode berjalan' },

  // REVENUE (Pendapatan) - Normal Balance: Credit
  { code: '4000', name: 'Pendapatan', type: 'revenue', subtype: 'revenue_root', normalBalance: 'credit', description: 'Pendapatan perusahaan' },
  { code: '4100', name: 'Pendapatan Penjualan', type: 'revenue', subtype: 'sales_revenue', normalBalance: 'credit', parentCode: '4000', description: 'Pendapatan dari penjualan barang' },
  { code: '4110', name: 'Penjualan Laptop', type: 'revenue', subtype: 'sales_revenue', normalBalance: 'credit', parentCode: '4100', description: 'Penjualan produk laptop' },
  { code: '4120', name: 'Penjualan Aksesoris', type: 'revenue', subtype: 'sales_revenue', normalBalance: 'credit', parentCode: '4100', description: 'Penjualan aksesoris laptop' },
  { code: '4200', name: 'Pendapatan Jasa', type: 'revenue', subtype: 'service_revenue', normalBalance: 'credit', parentCode: '4000', description: 'Pendapatan dari layanan service' },
  { code: '4210', name: 'Jasa Service Laptop', type: 'revenue', subtype: 'service_revenue', normalBalance: 'credit', parentCode: '4200', description: 'Pendapatan service dan perbaikan laptop' },
  { code: '4300', name: 'Pendapatan Lainnya', type: 'revenue', subtype: 'other_revenue', normalBalance: 'credit', parentCode: '4000', description: 'Pendapatan di luar usaha utama' },

  // EXPENSES (Biaya) - Normal Balance: Debit
  { code: '5000', name: 'Biaya', type: 'expense', subtype: 'expense_root', normalBalance: 'debit', description: 'Biaya operasional perusahaan' },
  
  // Cost of Goods Sold (HPP)
  { code: '5100', name: 'Harga Pokok Penjualan', type: 'expense', subtype: 'cost_of_goods_sold', normalBalance: 'debit', parentCode: '5000', description: 'HPP barang yang dijual' },
  { code: '5110', name: 'HPP Laptop', type: 'expense', subtype: 'cost_of_goods_sold', normalBalance: 'debit', parentCode: '5100', description: 'Harga pokok laptop yang dijual' },
  { code: '5120', name: 'HPP Aksesoris', type: 'expense', subtype: 'cost_of_goods_sold', normalBalance: 'debit', parentCode: '5100', description: 'Harga pokok aksesoris yang dijual' },
  { code: '5130', name: 'Kerugian Barang Rusak', type: 'expense', subtype: 'cost_of_goods_sold', normalBalance: 'debit', parentCode: '5100', description: 'Kerugian karena barang garansi rusak atau tidak dapat dijual kembali' },
  { code: '5140', name: 'Beban Garansi', type: 'expense', subtype: 'cost_of_goods_sold', normalBalance: 'debit', parentCode: '5100', description: 'Biaya perbaikan atau penggantian selama masa garansi' },
  
  // Operating Expenses (Biaya Operasional)
  { code: '5200', name: 'Biaya Operasional', type: 'expense', subtype: 'operating_expense', normalBalance: 'debit', parentCode: '5000', description: 'Biaya untuk menjalankan usaha' },
  { code: '5210', name: 'Biaya Gaji', type: 'expense', subtype: 'payroll_expense', normalBalance: 'debit', parentCode: '5200', description: 'Gaji dan tunjangan karyawan' },
  { code: '5220', name: 'Biaya Sewa', type: 'expense', subtype: 'rent_expense', normalBalance: 'debit', parentCode: '5200', description: 'Sewa tempat usaha' },
  { code: '5230', name: 'Biaya Listrik', type: 'expense', subtype: 'utility_expense', normalBalance: 'debit', parentCode: '5200', description: 'Biaya listrik dan air' },
  { code: '5240', name: 'Biaya Telepon & Internet', type: 'expense', subtype: 'communication_expense', normalBalance: 'debit', parentCode: '5200', description: 'Biaya komunikasi' },
  { code: '5250', name: 'Biaya Pemasaran', type: 'expense', subtype: 'marketing_expense', normalBalance: 'debit', parentCode: '5200', description: 'Biaya promosi dan iklan' },
  { code: '5260', name: 'Biaya Transportasi', type: 'expense', subtype: 'transport_expense', normalBalance: 'debit', parentCode: '5200', description: 'Biaya transport dan pengiriman' },
  { code: '5270', name: 'Biaya Perlengkapan', type: 'expense', subtype: 'supplies_expense', normalBalance: 'debit', parentCode: '5200', description: 'Biaya perlengkapan kantor' },
  { code: '5280', name: 'Biaya Penyusutan', type: 'expense', subtype: 'depreciation_expense', normalBalance: 'debit', parentCode: '5200', description: 'Penyusutan aset tetap' },
  { code: '5290', name: 'Biaya Lain-lain', type: 'expense', subtype: 'other_expense', normalBalance: 'debit', parentCode: '5200', description: 'Biaya operasional lainnya' },
  
  // Non-Operating Expenses
  { code: '5300', name: 'Biaya Non-Operasional', type: 'expense', subtype: 'non_operating_expense', normalBalance: 'debit', parentCode: '5000', description: 'Biaya di luar operasional utama' },
  { code: '5310', name: 'Biaya Bunga', type: 'expense', subtype: 'interest_expense', normalBalance: 'debit', parentCode: '5300', description: 'Biaya bunga pinjaman' },
  { code: '5320', name: 'Biaya Pajak', type: 'expense', subtype: 'tax_expense', normalBalance: 'debit', parentCode: '5300', description: 'Biaya pajak penghasilan' },
];

// Mapping untuk migrasi dari kategori lama ke akun baru
export const categoryToAccountMapping = {
  // Revenue mapping
  'Sales Revenue': '4110',
  'Service Revenue': '4210',
  'Rental Income': '4300',
  'Investment Income': '4300',
  'Other Income': '4300',

  // Expense mapping
  'Operational Expense': '5290',
  'Payroll': '5210',
  'Rent & Utilities': '5220',
  'Marketing': '5250',
  'Travel & Transport': '5260',
  'Office Supplies': '5270',
  'Technology': '5290',
  'Professional Services': '5290',
  'Insurance': '5290',
  'Taxes': '5320',
  'Other Expense': '5290',
};

// Default accounts untuk transaksi umum
export const commonAccountCodes = {
  CASH: '1111',
  BANK: '1112',
  ACCOUNTS_RECEIVABLE: '1120',
  INVENTORY: '1130',
  ACCOUNTS_PAYABLE: '2110',
  SALES_REVENUE: '4110',
  SERVICE_REVENUE: '4210',
  COST_OF_GOODS_SOLD: '5110',
  PAYROLL_EXPENSE: '5210',
  OTHER_EXPENSE: '5290',
};