"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, LogIn, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { apiSignOut } from "@/lib/api";
import ThemeToggle from "@/components/ThemeToggle";

const getInitials = (name?: string) => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const initials = (parts[0]?.[0] || "") + (parts.length > 1 ? parts[parts.length - 1][0] : "");
  return initials.toUpperCase() || "?";
};

/** Account / settings menu, modeled after the Claude-style account button:
 * an avatar + name pill in the nav that opens a small panel with appearance
 * controls and auth actions. Works both signed in (shows the user + Log out)
 * and signed out (shows Sign in / Sign up). */
const AccountMenu = ({ user }: { user: User | null }) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const handleSignOut = async () => {
    try {
      await apiSignOut();
      setOpen(false);
      toast.success("Signed out");
      router.replace("/sign-in");
      router.refresh();
    } catch (e: any) {
      toast.error(e?.message || "Failed to sign out");
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-full pl-1.5 pr-3 py-1.5 bg-dark-200 hover:bg-dark-200/70 transition-colors cursor-pointer"
      >
        <span className="flex items-center justify-center size-8 rounded-full bg-primary-200 text-dark-100 font-semibold text-sm shrink-0">
          {getInitials(user?.name)}
        </span>
        {user && (
          <span className="hidden sm:flex flex-col items-start leading-tight">
            <span className="text-sm font-semibold">{user.name}</span>
            <span className="text-xs opacity-60">Free plan</span>
          </span>
        )}
        <ChevronDown className={`size-4 opacity-70 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-64 rounded-2xl border border-light-600/20 bg-dark-200 shadow-xl p-2 z-50 flex flex-col gap-1"
        >
          {user && (
            <div className="px-3 py-2 border-b border-light-600/15 mb-1">
              <p className="text-sm font-semibold truncate">{user.name}</p>
              <p className="text-xs opacity-60 truncate">{user.email}</p>
            </div>
          )}

          <div className="flex items-center justify-between px-3 py-2 rounded-lg">
            <span className="text-sm">Appearance</span>
            <ThemeToggle />
          </div>

          <div className="h-px bg-light-600/15 my-1" />

          {user ? (
            <button
              type="button"
              onClick={handleSignOut}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left hover:bg-dark-300 transition-colors cursor-pointer"
            >
              <LogOut className="size-4" />
              Log out
            </button>
          ) : (
            <>
              <Link
                href="/sign-in"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-dark-300 transition-colors"
              >
                <LogIn className="size-4" />
                Sign in
              </Link>
              <Link
                href="/sign-up"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-dark-300 transition-colors"
              >
                <UserPlus className="size-4" />
                Sign up
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AccountMenu;
