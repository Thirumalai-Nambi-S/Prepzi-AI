"use client";

import React, { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGetCurrentUser } from "@/lib/api";
import Spinner from "@/components/Spinner";
import Footer from "@/components/Footer";

const AuthLayout = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    apiGetCurrentUser()
      .then(({ user }) => {
        if (user) router.replace("/dashboard");
      })
      .finally(() => setChecked(true));
  }, [router]);

  if (!checked) {
    return (
      <div className="auth-layout">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="auth-layout">
      {children}
      <div className="w-full max-w-lg">
        <Footer />
      </div>
    </div>
  );
};

export default AuthLayout;
