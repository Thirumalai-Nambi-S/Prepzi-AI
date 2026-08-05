"use client";

import React from "react";
import Agent from "@/components/Agent";
import { useUser } from "@/lib/UserContext";

const Page = () => {
  const user = useUser();

  return (
    <div>
      <h3>Create an Interview</h3>
      <p className="mt-2 opacity-80">
        Tap Start and tell the AI about the role, experience level, company, tech stack, and how many questions
        you want. It'll build you a full 3-round interview: a timed aptitude test, a technical round, and a
        behavioral round.
      </p>
      <Agent userName={user?.name || ""} userId={user?.id || ""} type="generate" />
    </div>
  );
};

export default Page;
