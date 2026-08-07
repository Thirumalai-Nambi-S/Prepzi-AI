"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGetCurrentUser } from "@/lib/api";
import { UserProvider } from "@/lib/UserContext";
import Spinner from "@/components/Spinner";
import AccountMenu from "@/components/AccountMenu";
import DateTimeClock from "@/components/DateTimeClock";
import Footer from "@/components/Footer";

const RootLayout = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    apiGetCurrentUser()
      .then(({ user }) => {
        if (!user) {
          router.replace("/sign-in");
        } else {
          setUser(user);
          setAuthChecked(true);
        }
      })
      .catch(() => router.replace("/sign-in"));
  }, [router]);

  if (!authChecked) {
    return (
      <div className="root-layout flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  return (
    <UserProvider user={user}>
      <div className="flex flex-col min-h-screen">
        <header className="sticky top-0 z-40 backdrop-blur-md bg-dark-100/80 border-b border-light-600/10 shadow-sm">
          <nav className="max-w-7xl mx-auto flex items-center justify-between gap-4 px-6 sm:px-16 py-4">
            <a href="/dashboard" className="flex items-center gap-2 shrink-0">
              <img src="/logo.png" alt="Prepzi-AI logo" width={38} height={38} className="rounded-full" />
              <h2 className="text-primary-200 max-sm:hidden">Prepzi-AI</h2>
            </a>

            <DateTimeClock className="hidden md:flex" />

            {/* Settings / account menu - always pinned to the top-right corner */}
            <AccountMenu user={user} />
          </nav>
        </header>

        <div className="root-layout flex-1">{children}</div>

        <div className="max-w-7xl mx-auto px-6 sm:px-16 w-full">
          <Footer />
        </div>
      </div>
    </UserProvider>
  );
};

export default RootLayout;
