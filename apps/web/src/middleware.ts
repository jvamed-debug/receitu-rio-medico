import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const protectedPrefixes = [
  "/dashboard",
  "/documents",
  "/prescriptions",
  "/exam-requests",
  "/certificates",
  "/free-documents",
  "/templates",
  "/patients",
  "/history",
  "/pdf-preview",
  "/delivery",
  "/settings"
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));

  if (!isProtected) {
    return NextResponse.next();
  }

  const session = request.cookies.get("receituario_access_token")?.value;

  if (session) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("redirect", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/documents/:path*",
    "/prescriptions/:path*",
    "/exam-requests/:path*",
    "/certificates/:path*",
    "/free-documents/:path*",
    "/templates/:path*",
    "/patients/:path*",
    "/history/:path*",
    "/pdf-preview/:path*",
    "/delivery/:path*",
    "/settings/:path*"
  ]
};
