import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, Building2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const registerSchema = z.object({
  name: z.string().min(2, 'Company name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  subdomain: z.string()
    .min(3, 'Subdomain must be at least 3 characters')
    .max(20, 'Subdomain must be less than 20 characters')
    .regex(/^[a-z0-9-]+$/, 'Subdomain can only contain lowercase letters, numbers, and hyphens')
    .refine(val => !val.startsWith('-') && !val.endsWith('-'), 'Subdomain cannot start or end with hyphen'),
  phone: z.string().optional(),
  address: z.string().optional(),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function SaasRegister() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [registrationResult, setRegistrationResult] = useState<any>(null);

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      subdomain: '',
      phone: '',
      address: '',
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/saas/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Registration failed');
      }

      setSuccess(true);
      setRegistrationResult(result);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success && registrationResult) {
    return (
      <div className=\"min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4\">
        <Card className=\"w-full max-w-md\">
          <CardHeader className=\"text-center\">
            <div className=\"mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4\">
              <CheckCircle className=\"w-6 h-6 text-green-600\" />
            </div>
            <CardTitle className=\"text-2xl text-green-700\">Registration Successful!</CardTitle>
            <CardDescription>
              Your LaptopPOS account has been created successfully.
            </CardDescription>
          </CardHeader>
          <CardContent className=\"space-y-4\">
            <div className=\"bg-gray-50 p-4 rounded-lg space-y-2\">
              <h3 className=\"font-semibold text-gray-900\">Account Details:</h3>
              <p><span className=\"text-gray-600\">Company:</span> {registrationResult.client.name}</p>
              <p><span className=\"text-gray-600\">Subdomain:</span> {registrationResult.client.subdomain}</p>
              <p><span className=\"text-gray-600\">Status:</span> <span className=\"text-green-600 font-medium\">7-day free trial</span></p>
            </div>
            
            <div className=\"bg-blue-50 p-4 rounded-lg\">
              <h3 className=\"font-semibold text-blue-900 mb-2\">Next Steps:</h3>
              <ol className=\"list-decimal list-inside space-y-1 text-sm text-blue-800\">
                <li>Access your dashboard using the link below</li>
                <li>Complete the setup wizard</li>
                <li>Start adding your products and services</li>
                <li>Choose a subscription plan before trial expires</li>
              </ol>
            </div>

            <Button 
              className=\"w-full\" 
              onClick={() => window.location.href = `${window.location.origin}?tenant=${registrationResult.client.subdomain}`}
            >
              Access Your Dashboard
            </Button>
            
            <p className=\"text-xs text-gray-500 text-center\">
              Your trial will expire in 7 days. You can upgrade anytime from your dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className=\"min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4\">
      <Card className=\"w-full max-w-md\">
        <CardHeader className=\"text-center\">
          <div className=\"mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4\">
            <Building2 className=\"w-6 h-6 text-blue-600\" />
          </div>
          <CardTitle className=\"text-2xl\">Start Your Free Trial</CardTitle>
          <CardDescription>
            Create your LaptopPOS account and get 7 days free access to all features.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className=\"space-y-4\">
            <div>
              <Label htmlFor=\"name\">Company Name</Label>
              <Input
                id=\"name\"
                {...form.register('name')}
                placeholder=\"Your Laptop Store\"
                className={form.formState.errors.name ? 'border-red-500' : ''}
              />
              {form.formState.errors.name && (
                <p className=\"text-sm text-red-500 mt-1\">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor=\"email\">Email Address</Label>
              <Input
                id=\"email\"
                type=\"email\"
                {...form.register('email')}
                placeholder=\"admin@yourstore.com\"
                className={form.formState.errors.email ? 'border-red-500' : ''}
              />
              {form.formState.errors.email && (
                <p className=\"text-sm text-red-500 mt-1\">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor=\"subdomain\">Choose Your Subdomain</Label>
              <div className=\"flex items-center space-x-2\">
                <Input
                  id=\"subdomain\"
                  {...form.register('subdomain')}
                  placeholder=\"yourstore\"
                  className={form.formState.errors.subdomain ? 'border-red-500' : ''}
                />
                <span className=\"text-sm text-gray-500\">.laptoppos.com</span>
              </div>
              {form.formState.errors.subdomain && (
                <p className=\"text-sm text-red-500 mt-1\">{form.formState.errors.subdomain.message}</p>
              )}
              <p className=\"text-xs text-gray-500 mt-1\">
                This will be your unique URL: yourstore.laptoppos.com
              </p>
            </div>

            <div>
              <Label htmlFor=\"phone\">Phone Number (Optional)</Label>
              <Input
                id=\"phone\"
                {...form.register('phone')}
                placeholder=\"+62 812 3456 7890\"
              />
            </div>

            <div>
              <Label htmlFor=\"address\">Address (Optional)</Label>
              <Input
                id=\"address\"
                {...form.register('address')}
                placeholder=\"Your store address\"
              />
            </div>

            {error && (
              <Alert className=\"border-red-200 bg-red-50\">
                <AlertCircle className=\"w-4 h-4 text-red-600\" />
                <AlertDescription className=\"text-red-700\">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <Button 
              type=\"submit\" 
              className=\"w-full\" 
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating Account...' : 'Start Free Trial'}
            </Button>
          </form>

          <div className=\"mt-6 text-center\">
            <p className=\"text-xs text-gray-500\">
              By creating an account, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}