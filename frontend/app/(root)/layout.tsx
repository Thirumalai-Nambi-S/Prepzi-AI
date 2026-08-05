"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGetCurrentUser } from "@/lib/api";
import { UserProvider } from "@/lib/UserContext";
import Spinner from "@/components/Spinner";
import AccountMenu from "@/components/AccountMenu";

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
      <div className="root-layout">
        <nav className="flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="Prepzi-AI logo" width={38} height={38} className="rounded-full" />
            <h2 className="text-primary-200">Prepzi-AI</h2>
          </a>

          <AccountMenu user={user} />
        </nav>

        {children}
      </div>
    </UserProvider>
  );
};

export default RootLayout;
