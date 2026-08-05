"use client";

import React, { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGetCurrentUser } from "@/lib/api";
import Spinner from "@/components/Spinner";

const AuthLayout = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    apiGetCurrentUser()
      .then(({ user }) => {
        if (user) router.replace("/");
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

  return <div className="auth-layout">{children}</div>;
};

export default AuthLayout;
