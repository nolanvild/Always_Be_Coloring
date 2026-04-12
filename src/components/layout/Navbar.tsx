"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn, initials } from "@/lib/utils";

type NavbarProps = {
  showMarketingLinks?: boolean;
};

const links = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#examples", label: "Examples" }
];

export function Navbar({ showMarketingLinks = false }: NavbarProps) {
  const { data: session, status } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isLoadingSession = status === "loading";
  const isAuthed = status === "authenticated" && Boolean(session?.user);

  return (
    <header className="sticky top-0 z-40 border-b border-white/60 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/ABC-logo.png"
            alt="ABC (Always Be Coloring)"
            width={110}
            height={60}
            className="h-auto w-[110px]"
            priority
          />
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {showMarketingLinks && links.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm text-gray-600 hover:text-gray-900">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {isLoadingSession ? (
            <div className="h-10 w-40 animate-pulse rounded-lg bg-gray-100" aria-label="Loading session" />
          ) : isAuthed ? (
            <>
              <Link href="/download" className="text-sm text-gray-600 hover:text-gray-900">
                My downloads
              </Link>
              <Button variant="secondary" onClick={() => signOut({ callbackUrl: "/" })}>
                Log out
              </Button>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-light font-semibold text-purple-dark">
                {initials(session?.user?.name)}
              </div>
            </>
          ) : (
            <>
              <Link href="/auth/login">
                <Button variant="secondary">Log in</Button>
              </Link>
              <Link href="/auth/signup">
                <Button>Sign up</Button>
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 md:hidden"
          onClick={() => setMobileOpen((value) => !value)}
          aria-label="Open navigation menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <div className={cn("border-t border-gray-100 px-4 py-4 md:hidden", mobileOpen ? "block" : "hidden")}>
        <div className="flex flex-col gap-3">
          {showMarketingLinks && links.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm text-gray-600" onClick={() => setMobileOpen(false)}>
              {link.label}
            </Link>
          ))}
          {isLoadingSession ? (
            <div className="h-10 w-full animate-pulse rounded-lg bg-gray-100" aria-label="Loading session" />
          ) : isAuthed ? (
            <>
              <Link href="/download" className="text-sm text-gray-600" onClick={() => setMobileOpen(false)}>
                My downloads
              </Link>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => {
                  setMobileOpen(false);
                  signOut({ callbackUrl: "/" });
                }}
              >
                Log out
              </Button>
            </>
          ) : (
            <>
              <Link href="/auth/login" onClick={() => setMobileOpen(false)}>
                <Button variant="secondary" className="w-full">Log in</Button>
              </Link>
              <Link href="/auth/signup" onClick={() => setMobileOpen(false)}>
                <Button className="w-full">Sign up</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
