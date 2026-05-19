"use client";
import { usePathname } from "next/navigation";
import Header from "@/components/Header";

const AUTH_ROUTES = ["/login", "/cadastro", "/redefinir-senha", "/atualizar-senha"];

const COPYRIGHT =
  "© 2026 Rafael Medeiros da Silva. Todos os direitos reservados. " +
  "Software sob licença de uso por prazo determinado em favor de Cores do Rio, " +
  "com vigência e direitos de uso estritamente condicionados à manutenção do acordo contratual vigente. " +
  "A titularidade da propriedade intelectual e do código-fonte permanece exclusiva do Licenciante.";

function Footer() {
  const text = `${COPYRIGHT}    —    `;
  return (
    <footer style={{
      backgroundColor: "#1A2A3A",
      borderTop: "1px solid rgba(243,236,224,0.07)",
      overflow: "hidden",
      padding: "9px 0",
    }}>
      <div className="marquee-track">
        {/* Duplica para looping contínuo */}
        {[0, 1].map(i => (
          <span key={i} style={{
            color: "rgba(243,236,224,0.28)",
            fontSize: "0.6rem",
            letterSpacing: "0.06em",
            whiteSpace: "nowrap",
            paddingRight: "6rem",
            fontFamily: "var(--font-inter)",
          }}>
            {text}
          </span>
        ))}
      </div>
    </footer>
  );
}

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuth = AUTH_ROUTES.some(r => pathname.startsWith(r));
  if (isAuth) return <>{children}</>;
  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
