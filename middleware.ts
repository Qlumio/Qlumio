import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE_ACCESS } from "@/lib/supabase/client";

const PUBLIC_PATHS = ["/login", "/register", "/join"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Alltid tillat offentlige ruter
  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  // Sjekk om brukeren har et access-token
  const accessToken = request.cookies.get(AUTH_COOKIE_ACCESS)?.value;

  if (!accessToken && !isPublicPath) {
    // Ikke innlogget og prøver å nå en beskyttet side → login
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (accessToken && isPublicPath) {
    // Allerede innlogget og prøver å nå auth-side → hjem
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Kjør på alle ruter unntatt statiske filer
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
