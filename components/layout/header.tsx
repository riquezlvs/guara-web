"use client";

import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";

export function Header() {
  const pathname = usePathname();

  const getPageTitle = () => {
    if (pathname === "/") return "Início";
    if (pathname.startsWith("/extrato")) return "Extrato";
    if (pathname.startsWith("/cartoes")) return "Cartões";
    if (pathname.startsWith("/investimentos")) return "Investimentos";
    return "Finanças";
  };

  return (
    <header className="fixed top-0 w-full z-50 pt-safe bg-[#f5f5f5]/85 backdrop-blur-xl border-b border-black/[0.04] shadow-[0_1px_8px_rgba(0,0,0,0.02)]">
      <div className="h-14 px-4 max-w-md mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#e7000b] animate-pulse"></span>
          <span className="text-[15px] text-[#0a0a0a] font-semibold tracking-tight">
            Guará IA
          </span>
          <Badge
            variant="outline"
            className="px-1.5 py-0 rounded-[6px] bg-white text-[#737373] border-black/10 font-mono text-[10px] uppercase font-medium"
          >
            v1.0
          </Badge>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[12px] text-[#737373] inline-block tracking-wider uppercase mr-1">
            {getPageTitle()}
          </span>
          <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center">
            <span className="material-symbols-outlined text-[18px]">
              person
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
