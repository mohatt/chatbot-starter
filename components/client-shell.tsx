"use client";
import { useEffect, useState, type ReactNode } from "react";
import { ApiClientProvider } from '@/api/client-provider'

export function ClientShell({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return (
    <ApiClientProvider>
      {children}
    </ApiClientProvider>
  );
}
