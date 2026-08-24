import { test, expect, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { SignJWT } from "jose";
import { proxy } from "./proxy";

const TEST_SECRET = "test-jwt-secret";

beforeAll(() => {
  process.env.JWT_SECRET = TEST_SECRET;
});

function makeToken(role: string, expiresInSeconds = 3600) {
  return new SignJWT({ id: "1", role })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(Math.floor(Date.now() / 1000) + expiresInSeconds)
    .sign(new TextEncoder().encode(TEST_SECRET));
}

function makeRequest(pathname: string, cookies: Record<string, string> = {}) {
  const cookieHeader = Object.entries(cookies)
    .map(([key, value]) => `${key}=${value}`)
    .join("; ");
  return new NextRequest(`http://localhost:3000${pathname}`, {
    headers: cookieHeader ? { cookie: cookieHeader } : {},
  });
}

function isPassThrough(response: Awaited<ReturnType<typeof proxy>>) {
  return response.headers.get("x-middleware-next") === "1";
}

test("redirects an authenticated user away from /login", async () => {
  const token = await makeToken("user");
  const response = await proxy(makeRequest("/login", { "auth-token": token }));

  expect(response.status).toBe(307);
  expect(response.headers.get("location")).toBe("http://localhost:3000/");
});

test("redirects an authenticated user away from /register", async () => {
  const token = await makeToken("user");
  const response = await proxy(makeRequest("/register", { "auth-token": token }));

  expect(response.headers.get("location")).toBe("http://localhost:3000/");
});

test("allows an unauthenticated user to view /login", async () => {
  const response = await proxy(makeRequest("/login"));

  expect(isPassThrough(response)).toBe(true);
});

test("allows a user with an expired token to view /login and clears the stale cookies", async () => {
  const expiredToken = await makeToken("user", -10);
  const response = await proxy(makeRequest("/login", { "auth-token": expiredToken }));

  expect(isPassThrough(response)).toBe(true);
  expect(response.cookies.get("auth-token")?.value).toBe("");
  expect(response.cookies.get("user-role")?.value).toBe("");
  expect(response.cookies.get("user-id")?.value).toBe("");
});

test("redirects an unauthenticated user away from a protected page", async () => {
  const response = await proxy(makeRequest("/dashboard"));

  expect(response.status).toBe(307);
  expect(response.headers.get("location")).toBe("http://localhost:3000/login");
});

test("redirects a user with an expired token away from a protected page and clears the stale cookies", async () => {
  const expiredToken = await makeToken("admin", -10);
  const response = await proxy(makeRequest("/dashboard", { "auth-token": expiredToken }));

  expect(response.headers.get("location")).toBe("http://localhost:3000/login");
  expect(response.cookies.get("auth-token")?.value).toBe("");
  expect(response.cookies.get("user-role")?.value).toBe("");
  expect(response.cookies.get("user-id")?.value).toBe("");
});

test("redirects a user with a tampered token away from a protected page", async () => {
  const token = await makeToken("admin");
  const response = await proxy(
    makeRequest("/dashboard", { "auth-token": `${token}tampered` }),
  );

  expect(response.headers.get("location")).toBe("http://localhost:3000/login");
});

test("redirects a non-admin user away from /management", async () => {
  const token = await makeToken("user");
  const response = await proxy(makeRequest("/management", { "auth-token": token }));

  expect(response.headers.get("location")).toBe("http://localhost:3000/dashboard");
});

test("redirects a non-admin user away from /accounts", async () => {
  const token = await makeToken("user");
  const response = await proxy(makeRequest("/accounts", { "auth-token": token }));

  expect(response.headers.get("location")).toBe("http://localhost:3000/dashboard");
});

test("allows an admin user to view /management", async () => {
  const token = await makeToken("admin");
  const response = await proxy(makeRequest("/management", { "auth-token": token }));

  expect(isPassThrough(response)).toBe(true);
});

test("allows an authenticated user to view a non-admin protected page", async () => {
  const token = await makeToken("user");
  const response = await proxy(makeRequest("/dashboard", { "auth-token": token }));

  expect(isPassThrough(response)).toBe(true);
});

test("treats a forged user-role cookie as untrusted and derives role from the JWT instead", async () => {
  // A verified "user" token paired with a hand-set user-role=admin cookie
  // must NOT grant admin access — role is only ever taken from the verified JWT.
  const token = await makeToken("user");
  const response = await proxy(
    makeRequest("/management", { "auth-token": token, "user-role": "admin" }),
  );

  expect(response.headers.get("location")).toBe("http://localhost:3000/dashboard");
});
