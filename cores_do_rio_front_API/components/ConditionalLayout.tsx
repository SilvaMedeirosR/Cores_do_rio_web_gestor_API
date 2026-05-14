"use client";
import { usePathname } from "next/navigation";
import Header from "@/components/Header";

const AUTH_ROUTES = ["/login", "/cadastro", "/redefinir-senha", "/atualizar-senha"];

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuth = AUTH_ROUTES.some(r => pathname.startsWith(r));
  if (isAuth) return <>{children}</>;
  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
    </>
  );
}
