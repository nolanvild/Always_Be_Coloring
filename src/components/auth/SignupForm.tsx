"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const signupSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

type SignupValues = z.infer<typeof signupSchema>;

function getStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
}

export function SignupForm() {
  const router = useRouter();
  const { register, watch, handleSubmit, formState: { errors, isSubmitting } } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema)
  });
  const password = watch("password", "");
  const strength = getStrength(password);

  const onSubmit = async () => {
    toast.success("Account created. You can log in now.");
    router.push("/auth/login");
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Input placeholder="First name" {...register("firstName")} />
          {errors.firstName ? <p className="mt-1 text-xs text-red-500">Required</p> : null}
        </div>
        <div>
          <Input placeholder="Last name" {...register("lastName")} />
          {errors.lastName ? <p className="mt-1 text-xs text-red-500">Required</p> : null}
        </div>
      </div>
      <div>
        <Input type="email" placeholder="Email address" {...register("email")} />
        {errors.email ? <p className="mt-1 text-xs text-red-500">{errors.email.message}</p> : null}
      </div>
      <div>
        <Input type="password" placeholder="Password" {...register("password")} />
        <div className="mt-2 grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((step) => (
            <div
              key={step}
              className={cn(
                "h-2 rounded-full",
                strength >= step ? (step < 2 ? "bg-red-400" : step === 2 ? "bg-amber-400" : "bg-teal-brand") : "bg-gray-200"
              )}
            />
          ))}
        </div>
      </div>
      <div>
        <Input type="password" placeholder="Confirm password" {...register("confirmPassword")} />
        {errors.confirmPassword ? <p className="mt-1 text-xs text-red-500">{errors.confirmPassword.message}</p> : null}
      </div>
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Creating account..." : "Create account"}
      </Button>
      <p className="text-xs leading-5 text-gray-500">
        By creating an account you agree to our{" "}
        <Link href="#" className="text-purple-brand underline">Terms of Service</Link> and{" "}
        <Link href="#" className="text-purple-brand underline">Privacy Policy</Link>.
      </p>
      <p className="text-center text-sm text-gray-600">
        Already have an account?{" "}
        <Link href="/auth/login" className="font-medium text-purple-brand underline">Log in</Link>
      </p>
    </form>
  );
}
