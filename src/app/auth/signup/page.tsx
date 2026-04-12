import Image from "next/image";
import { SignupForm } from "@/components/auth/SignupForm";

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(238,237,254,0.9),transparent_32%)] px-4 py-10">
      <div className="w-full max-w-xl rounded-3xl border border-purple-mid/30 bg-white p-8 shadow-soft">
        <div className="mb-6 text-center">
          <Image
            src="/ABC-logo.png"
            alt="ABC (Always Be Coloring)"
            width={176}
            height={96}
            className="mx-auto mb-4 h-auto w-44"
            priority
          />
          <h1 className="text-2xl font-medium text-gray-900">Create your account</h1>
          <p className="mt-2 text-sm text-gray-500">Start turning prompts and photos into printable pages.</p>
        </div>
        <SignupForm />
      </div>
    </main>
  );
}
