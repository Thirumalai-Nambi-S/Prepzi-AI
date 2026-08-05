"use client";

import React, { createContext, useContext } from "react";

const UserContext = createContext<User | null>(null);

export const UserProvider = ({ user, children }: { user: User | null; children: React.ReactNode }) => (
  <UserContext.Provider value={user}>{children}</UserContext.Provider>
);

/** The current user, already verified once by the root layout - no extra
 * network round trip needed on every page. */
export const useUser = () => useContext(UserContext);
