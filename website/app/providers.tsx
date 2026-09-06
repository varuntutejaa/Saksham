"use client";

import { useEffect, type ReactNode } from "react";
import { BeneficiaryAuthProvider } from "@/lib/beneficiary-auth";
import { SiteStoreProvider } from "@/lib/site-store";
import { installGlobalErrorReporting } from "@/lib/error-reporting";

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    installGlobalErrorReporting();
  }, []);

  return (
    <SiteStoreProvider>
      <BeneficiaryAuthProvider>{children}</BeneficiaryAuthProvider>
    </SiteStoreProvider>
  );
}
