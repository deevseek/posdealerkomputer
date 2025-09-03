export const defaultRoleConfigs = [
  {
    name: 'admin',
    displayName: 'Administrator',
    description: 'Full system access with all permissions',
    permissions: [
      'dashboard_view', 'pos_access', 'inventory_full', 'purchasing_full',
      'financial_full', 'reports_full', 'customers_full', 'suppliers_full',
      'service_tickets_full', 'users_full', 'roles_full', 'settings_full',
      'whatsapp_settings', 'store_settings', 'system_admin'
    ]
  },
  {
    name: 'kasir',
    displayName: 'Kasir',
    description: 'Point of sale operations and basic customer management',
    permissions: [
      'dashboard_view', 'pos_access', 'inventory_view', 'customers_view',
      'customers_create', 'customers_edit', 'transactions_create',
      'reports_sales_view'
    ]
  },
  {
    name: 'teknisi',
    displayName: 'Teknisi',
    description: 'Service ticket management and technical operations',
    permissions: [
      'dashboard_view', 'service_tickets_full', 'inventory_view',
      'inventory_update_stock', 'customers_view', 'customers_create',
      'customers_edit', 'reports_services_view'
    ]
  },
  {
    name: 'purchasing',
    displayName: 'Purchasing',
    description: 'Purchasing and supplier management',
    permissions: [
      'dashboard_view', 'purchasing_full', 'suppliers_full', 'inventory_full',
      'reports_purchasing_view', 'reports_inventory_view'
    ]
  },
  {
    name: 'finance',
    displayName: 'Finance',
    description: 'Financial management and reporting',
    permissions: [
      'dashboard_view', 'financial_full', 'reports_full', 'customers_view',
      'suppliers_view', 'transactions_view'
    ]
  },
  {
    name: 'owner',
    displayName: 'Owner',
    description: 'Business owner with comprehensive access',
    permissions: [
      'dashboard_view', 'pos_access', 'inventory_view', 'purchasing_view',
      'financial_full', 'reports_full', 'customers_full', 'suppliers_view',
      'service_tickets_view', 'users_view', 'settings_view'
    ]
  }
];