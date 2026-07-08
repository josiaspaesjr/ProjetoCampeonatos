"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** re-busca os dados do servidor a cada `segundos` — usado nas telas ao vivo */
export function AutoRefresh({ segundos = 10 }: { segundos?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), segundos * 1000);
    return () => clearInterval(id);
  }, [router, segundos]);
  return null;
}
