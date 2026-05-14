import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { temAcesso, rotaHome, type Funcao } from "@/lib/auth/permissions";

const AUTH_ROUTES = ["/login", "/cadastro", "/redefinir-senha", "/atualizar-senha"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r));

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll()     { return request.cookies.getAll(); },
        setAll(list) { list.forEach(({ name, value, options }) => { request.cookies.set(name, value); response.cookies.set(name, value, options); }); },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Não autenticado → login
  if (!user && !isAuthRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Autenticado tentando acessar página de auth → rota da sua função
  if (user && isAuthRoute) {
    const funcao = user.user_metadata?.funcao as string | undefined;
    return NextResponse.redirect(new URL(rotaHome(funcao ?? ""), request.url));
  }

  // Autenticado em rota do sistema → verificar permissão
  if (user && !isAuthRoute) {
    const funcao = user.user_metadata?.funcao as Funcao | undefined;
    if (funcao && !temAcesso(funcao, pathname)) {
      return NextResponse.redirect(new URL(rotaHome(funcao), request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
