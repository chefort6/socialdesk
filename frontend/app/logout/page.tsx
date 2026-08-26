"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { Loader2 } from "lucide-react";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    // 1. Best-effort notify the backend (no server session to invalidate today,
    // but keeps a single contract if cookies ever become httpOnly/server-set).
    fetch("/api/auth/logout", { method: "POST" }).catch(() => {});

    // 2. Remove the "session" cookie
    // This tells the Middleware "I am no longer allowed in"
    Cookies.remove("auth-token");
    Cookies.remove("user-role");
    Cookies.remove("user-id");

    // 3. Wait 1.5 seconds for visual effect, then redirect to Login
    const timer = setTimeout(() => {
      router.push("/login");
    }, 1500);

    // Cleanup timer if the user leaves the page early
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-primary">
      <Loader2 className="w-10 h-10 animate-spin mb-4" />
      <h2 className="text-xl font-bold">Signing out...</h2>
      <p className="text-muted text-sm mt-2">See you next time!</p>
    </div>
  );
}
