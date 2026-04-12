import Image from "next/image";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(238,237,254,0.9),transparent_32%)] px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-purple-mid/30 bg-white p-8 shadow-soft">
        <div className="mb-6 text-center">
          <Image src="/logo.svg" alt="ABC (Always Be Coloring)" width={48} height={48} className="mx-auto mb-4" />
          <h1 className="text-2xl font-medium text-gray-900">Welcome back</h1>
          <p className="mt-2 text-sm text-gray-500">Log in to keep building your next coloring book.</p>
        </div>
        <LoginForm callbackUrl="/" />
      </div>
    </main>
  );
}
