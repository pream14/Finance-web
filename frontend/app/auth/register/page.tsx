import RegisterForm from '@/components/auth/register-form';

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900">Create Account</h1>
            <p className="mt-2 text-gray-600">Join the Finance Collection System</p>
          </div>
          <RegisterForm />
        </div>
      </div>
    </div>
  );
}
