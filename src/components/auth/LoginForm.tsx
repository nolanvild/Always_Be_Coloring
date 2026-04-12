"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters")
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm({ callbackUrl = "/" }: { callbackUrl?: string }) {
  const router = useRouter();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = async (values: LoginValues) => {
    const result = await signIn("credentials", {
      email: values.email,
      password: values.password,
      callbackUrl,
      redirect: false
    });
    if (result?.error) {
      toast.error("Login failed. Please check your credentials.");
      return;
    }
    router.replace(result?.url ?? callbackUrl);
    router.refresh();
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <div>
        <Input type="email" placeholder="Email address" {...register("email")} />
        {errors.email ? <p className="mt-1 text-xs text-red-500">{errors.email.message}</p> : null}
      </div>
      <div>
        <Input type="password" placeholder="Password" {...register("password")} />
        {errors.password ? <p className="mt-1 text-xs text-red-500">{errors.password.message}</p> : null}
      </div>
      <div className="flex items-center justify-between text-xs text-gray-600">
        <label className="flex items-center gap-2">
          <input type="checkbox" className="rounded border-gray-300" />
          Remember me
        </label>
        <Link href="#" className="text-purple-brand underline">Forgot password?</Link>
      </div>
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Signing in..." : "Log in"}
      </Button>
      <div className="relative text-center text-xs text-gray-400">
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-gray-200" />
        <span className="relative bg-white px-3">or continue with</span>
      </div>
      <Button
        type="button"
        variant="secondary"
        className="w-full"
        onClick={() => signIn("google", { callbackUrl })}
      >
        Continue with Google
      </Button>
      <p className="text-center text-sm text-gray-600">
        Don&apos;t have an account?{" "}
        <Link href="/auth/signup" className="font-medium text-purple-brand underline">Sign up</Link>
      </p>
    </form>
  );
}
