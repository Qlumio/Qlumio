import { NextResponse, type NextRequest } from "next/server";

const AUTH_COOKIE_ACCESS = "qlumio-access-token";
const PUBLIC_PATHS = ["/login", "/register", "/join", "/om", "/feedback"];

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const accessToken = request.cookies.get(AUTH_COOKIE_ACCESS)?.value;

  if (accessToken && isTokenExpired(accessToken) && !isPublicPath) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(AUTH_COOKIE_ACCESS);
    return response;
  }

  if (!accessToken && !isPublicPath) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (accessToken && !isTokenExpired(accessToken) && isPublicPath) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Ekskluder statiske filer, metadata-ruter (manifest, robots, sitemap) og
    // API-ruter fra auth-redirect. Disse skal ALDRI sendes til login-siden som
    // HTML, siden nettlesere/klienter forventer JSON eller rådata derfra –
    // en HTML-redirect der gir kryptiske parse-feil (f.eks. "Manifest: Line 1,
    // column 1, Syntax error").
    "/((?!_next/static|_next/image|favicon.ico|manifest|robots.txt|sitemap.xml|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
