import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Verifies the token's signature and expiry against the same secret the
// backend signs with (see backend/.env JWT_SECRET). Returns the embedded
// role on success, or null for a missing/expired/tampered/malformed token so
// callers can treat all of those cases as "no session" the same way.
async function getVerifiedRole(token: string): Promise<string | null> {
  const secret = process.env.JWT_SECRET;
  if (!secret || !token) return null;

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    return typeof payload.role === "string" ? payload.role : "user";
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isPublicPath = path === "/login" || path === "/register";
  const isAdminPath = path.startsWith("/management") || path.startsWith("/accounts");

  const token = request.cookies.get("auth-token")?.value || "";
  const role = await getVerifiedRole(token);
  const hasValidSession = role !== null;

  // Drop stale cookies whenever a token was presented but failed
  // verification (expired, tampered, or signed with a different secret).
  const clearStaleSession = (response: NextResponse) => {
    if (token && !hasValidSession) {
      response.cookies.delete("auth-token");
      response.cookies.delete("user-role");
      response.cookies.delete("user-id");
    }
    return response;
  };

  // SCENARIO A: User is on public page but has a valid session -> Go to Dashboard
  if (isPublicPath && hasValidSession) {
    return NextResponse.redirect(new URL("/", request.nextUrl));
  }

  // SCENARIO B: User is on protected page without a valid session -> Go to Login
  if (!isPublicPath && !hasValidSession) {
    return clearStaleSession(NextResponse.redirect(new URL("/login", request.nextUrl)));
  }

  // SCENARIO C: Logged-in user tries to access admin page but is NOT an admin -> Go to Dashboard
  // Role comes from the verified JWT payload, not a separate client-writable cookie.
  if (isAdminPath && role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", request.nextUrl));
  }

  return clearStaleSession(NextResponse.next());
}

export const config = {
  matcher: [
    "/",
    "/dashboard",
    "/schedule",
    "/analytics",
    "/accounts",
    "/posts",
    "/settings",
    "/management",
    "/profile",
    "/notifications",
    "/login",
    "/register"
  ],
};
