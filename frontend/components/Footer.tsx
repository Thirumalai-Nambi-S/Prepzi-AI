"use client";

import React from "react";

/** Shared copyright footer shown at the bottom of the landing page, the
 * auth pages, and the dashboard - keeps attribution consistent everywhere. */
const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="w-full mt-16 pt-8 pb-6 border-t border-light-600/15 flex flex-col items-center gap-2 text-center animate-fadeIn">
      <p className="text-sm opacity-70">
        &copy; {year} <span className="font-semibold text-primary-200">Thirumalai Nambi</span>. All rights reserved.
      </p>
      <p className="text-xs opacity-50">Prepzi-AI &mdash; AI-Powered Mock Interview Platform</p>
    </footer>
  );
};

export default Footer;
