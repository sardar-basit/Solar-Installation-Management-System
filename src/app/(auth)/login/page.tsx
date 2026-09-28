import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-sky-900 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center text-white">
          <h1 className="text-3xl font-semibold tracking-tight">SIMS</h1>
          <p className="mt-2 text-sm text-slate-300">
            Solar Installation Management System
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
