import { db } from './db';
import { plans } from '../shared/saas-schema';

const seedPlans = async () => {
  console.log('Seeding subscription plans...');

  const planData = [
    {
      name: 'Basic',
      description: 'Perfect untuk usaha kecil dengan fitur lengkap untuk mengelola laptop service',
      price: 149000, // Rp 149.000
      currency: 'IDR',
      billingPeriod: 'monthly',
      isActive: true,
      features: JSON.stringify([
        'Manajemen stok laptop & sparepart',
        'POS system untuk penjualan',
        'Tiket servis & tracking',
        'Laporan penjualan dasar',
        'Backup data otomatis'
      ]),
      limits: JSON.stringify({
        maxUsers: 3,
        maxStorage: 1000, // MB
        maxTransactionsPerMonth: 500
      }),
      maxUsers: 3,
      maxTransactionsPerMonth: 500,
      maxStorageGB: 1,
      whatsappIntegration: false,
      customBranding: false,
      apiAccess: false,
      prioritySupport: false
    },
    {
      name: 'Professional',
      description: 'Solusi lengkap untuk toko laptop dengan volume menengah dan fitur advanced',
      price: 299000, // Rp 299.000
      currency: 'IDR',
      billingPeriod: 'monthly',
      isActive: true,
      features: JSON.stringify([
        'Semua fitur Basic',
        'Integrasi WhatsApp untuk notifikasi',
        'Laporan keuangan lengkap',
        'Multi-user access',
        'Custom branding toko',
        'API access untuk integrasi'
      ]),
      limits: JSON.stringify({
        maxUsers: 10,
        maxStorage: 5000, // MB
        maxTransactionsPerMonth: 2000
      }),
      maxUsers: 10,
      maxTransactionsPerMonth: 2000,
      maxStorageGB: 5,
      whatsappIntegration: true,
      customBranding: true,
      apiAccess: true,
      prioritySupport: false
    },
    {
      name: 'Enterprise',
      description: 'Untuk toko laptop besar dengan multiple cabang dan fitur enterprise',
      price: 599000, // Rp 599.000
      currency: 'IDR',
      billingPeriod: 'monthly',
      isActive: true,
      features: JSON.stringify([
        'Semua fitur Professional',
        'Multi-branch management',
        'Advanced analytics & reporting',
        'Priority customer support',
        'Custom domain',
        'Advanced API features',
        'Dedicated account manager'
      ]),
      limits: JSON.stringify({
        maxUsers: 50,
        maxStorage: 20000, // MB
        maxTransactionsPerMonth: 10000
      }),
      maxUsers: 50,
      maxTransactionsPerMonth: 10000,
      maxStorageGB: 20,
      whatsappIntegration: true,
      customBranding: true,
      apiAccess: true,
      prioritySupport: true
    }
  ];

  try {
    // Check if plans already exist
    const existingPlans = await db.select().from(plans);
    
    if (existingPlans.length === 0) {
      await db.insert(plans).values(planData);
      console.log('✅ Subscription plans seeded successfully!');
      console.log(`Created ${planData.length} plans:`, planData.map(p => p.name).join(', '));
    } else {
      console.log('✅ Plans already exist, skipping seed');
    }
  } catch (error) {
    console.error('❌ Error seeding plans:', error);
  }
};

// Run if called directly
if (require.main === module) {
  seedPlans().then(() => process.exit(0));
}

export { seedPlans };