"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { Facebook, Instagram, Youtube, Trash2, Plus, X } from "lucide-react";

/* ------------------------- Types ------------------------- */
type Platform = {
  id: string;
  name: string;
  color: string;
  icon: React.ReactNode;
};

type Connected = {
  id: string;
  platformId: string;
  username: string;
  connectedDate: string;
};


const platforms: Platform[] = [
  { id: "facebook", name: "Facebook", color: "text-blue-600 bg-blue-50", icon: <Facebook size={20} /> },
  { id: "instagram", name: "Instagram", color: "text-pink-600 bg-pink-50", icon: <Instagram size={20} /> },
  {
    id: "x",
    name: "X",
    color: "text-gray-700 bg-gray-100",
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  { id: "tiktok", name: "TikTok", color: "text-black bg-gray-100", icon: <TikTokIcon /> },
  { id: "pinterest", name: "Pinterest", color: "text-red-600 bg-red-50", icon: <PinterestIcon /> },
  { id: "youtube", name: "YouTube", color: "text-red-600 bg-red-50", icon: <Youtube size={20} /> },
];

const formatLongDate = (d = new Date()) => d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

function transformAccount(raw: any): Connected {
  return {
    id: raw.id,
    platformId: raw.platforms?.code ?? '',
    username: raw.username ?? raw.display_name ?? '—',
    connectedDate: formatLongDate(new Date(raw.connected_at)),
  };
}

export default function AccountsPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const role = Cookies.get("user-role");
    if (role !== "admin") router.push("/dashboard");
    else setIsAuthorized(true);
  }, [router]);

  const [connectedAccounts, setConnectedAccounts] = useState<Connected[]>([]);

  useEffect(() => {
    fetch('/api/accounts', { credentials: 'include' })
      .then(res => res.json())
      .then(envelope => {
        const list = envelope?.data ?? envelope;
        setConnectedAccounts((Array.isArray(list) ? list : []).map(transformAccount));
      });
  }, []);

  const [connectPlatformId, setConnectPlatformId] = useState<string | null>(null); // null | "selector"
  const [disconnectId, setDisconnectId] = useState<string | null>(null);
  const [confirmChecked, setConfirmChecked] = useState(false);

  const findPlatform = (id: string | undefined) => platforms.find((p) => p.id === id);

  const openAddSelector = () => setConnectPlatformId("selector");

  const initiateOAuth = (platformId: string) => {
    if (platformId === "facebook" || platformId === "instagram") {
      window.location.href = "/api/auth/facebook/redirect";
    } else if (platformId === "pinterest") {
      window.location.href = "/api/auth/pinterest/oauth";
    } else if (platformId === "youtube") {
      const userId = Cookies.get("user-id");
      if (userId) {
        window.location.href = `/api/auth/youtube/oauth?userId=${userId}`;
      } else {
        alert("User ID missing. Please log in again.");
      }
    } else if (platformId === "x") {
      const userId = Cookies.get("user-id");
      if (userId) {
        window.location.href = `/api/auth/twitter/oauth?userId=${userId}`;
      } else {
        alert("User ID missing. Please log in again.");
      }
    } else {
      alert(`${findPlatform(platformId)?.name} connection is coming soon!`);
    }
  };

  const openDisconnectModal = (connId: string) => {
    setDisconnectId(connId);
    setConfirmChecked(false);
  };

  const handleConfirmDisconnect = async () => {
    if (!disconnectId || !confirmChecked) return;
    const res = await fetch(`/api/accounts/${disconnectId}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    if (res.ok) setConnectedAccounts((prev) => prev.filter((c) => c.id !== disconnectId));
    setDisconnectId(null);
    setConfirmChecked(false);
  };

  const closeAllModals = () => {
    setConnectPlatformId(null);
    setDisconnectId(null);
    setConfirmChecked(false);
  };

  if (!isAuthorized) return null;

  return (
    <div className="flex flex-col gap-6 overflow-x-hidden pb-10">
      
      {/* Header & Main Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Connected Accounts</h1>
          <p className="text-gray-500 mt-1">Manage your social media accounts</p>
        </div>
        
        {/* Moved the Add Account button here to match the Management Page layout */}
        <button
          onClick={openAddSelector}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#274C77] text-white text-sm rounded-lg font-bold hover:bg-[#1a385b] transition-colors shadow-sm shrink-0"
        >
          <Plus size={18} /> Add Account
        </button>
      </div>

      {/* Connected Accounts Grid (Wrapper styling removed to blend with background) */}
      <div className="mt-2">
        {connectedAccounts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white/50 p-10 text-center text-gray-500">
            No accounts connected yet. Tap Add Account to connect a platform.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 sm:gap-5 lg:gap-6">
            {connectedAccounts.map((c) => {
              const p = findPlatform(c.platformId)!;
              return (
                <div key={c.id} className="relative rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-1">
                  
                  {/* Status Dot */}
                  <div className="absolute right-5 top-5">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500 shadow-sm" title="Connected" />
                  </div>

                  <div className="flex items-start gap-4">
                    <div className={`inline-flex items-center justify-center rounded-xl p-3 ${p.color}`}>
                      {p.icon}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="truncate font-bold text-gray-900">{p.name}</div>
                      <div className="mt-0.5 truncate text-xs font-medium text-gray-500">{c.username}</div>
                      
                      <div className="mt-4 text-xs font-medium text-gray-400">
                        Connected <span className="ml-1 text-gray-600">{c.connectedDate}</span>
                      </div>

                      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-2">
                        <button className="inline-flex w-full items-center justify-center rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors sm:w-auto sm:min-w-[112px]">
                          + Assign User
                        </button>

                        <button
                          onClick={() => openDisconnectModal(c.id)}
                          className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-100 transition-colors sm:w-auto sm:min-w-[112px]"
                        >
                          <Trash2 size={14} /> Disconnect
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ================= MODALS ================= */}

      {/* Centered selector modal */}
      {connectPlatformId === "selector" && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 backdrop-blur-sm p-3 overflow-y-auto sm:items-center sm:p-4">
          <div className="w-full max-w-4xl rounded-2xl border border-gray-100 bg-white p-4 shadow-xl max-h-[90dvh] overflow-y-auto sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h4 className="text-xl font-bold text-gray-900">Add Account</h4>
              <button onClick={closeAllModals} className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-colors" aria-label="Close">
                <X size={20} />
              </button>
            </div>

            <p className="mb-6 text-sm text-gray-500 font-medium">Choose a platform to connect to SocialDesk.</p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:gap-4">
              {platforms.map((p) => (
                <div key={p.id} className="flex h-full flex-col items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50/50 p-5 text-center transition-all hover:bg-white hover:shadow-md hover:border-gray-200">
                  <div className={`rounded-xl p-4 ${p.color}`}>{p.icon}</div>
                  <div className="text-sm font-bold text-gray-900">{p.name}</div>

                  <div className="mt-auto pt-4 flex w-full justify-center">
                    <button
                      onClick={() => initiateOAuth(p.id)}
                      className="inline-flex w-full items-center justify-center rounded-lg bg-white border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-700 whitespace-nowrap hover:bg-[#274C77] hover:text-white hover:border-[#274C77] transition-all shadow-sm"
                    >
                      Connect
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}


      {/* Disconnect modal */}
      {disconnectId && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-xl max-h-[90dvh] overflow-y-auto sm:p-8">
            <div className="mb-4 flex items-center justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
                <Trash2 size={28} className="text-red-500" />
              </div>
            </div>

            <h3 className="mb-2 text-xl font-bold text-gray-900">Disconnect Account?</h3>

            <p className="mb-6 text-sm font-medium text-gray-500">
              You are about to remove{" "}
              <span className="font-bold text-gray-900">{connectedAccounts.find((c) => c.id === disconnectId)?.username ?? "this account"}</span>. We will
              stop tracking data for this platform immediately.
            </p>

            <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4 text-left">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmChecked}
                  onChange={(e) => setConfirmChecked(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-[#274C77] focus:ring-[#274C77]"
                />
                <div className="text-sm font-medium text-gray-700 leading-tight">
                  I understand that SocialDesk will no longer have access to this account and historical data may be lost.
                </div>
              </label>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                onClick={() => {
                  setDisconnectId(null);
                  setConfirmChecked(false);
                }}
                className="w-full rounded-lg border border-gray-200 bg-white py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors sm:w-auto sm:px-6"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDisconnect}
                disabled={!confirmChecked}
                className={`w-full rounded-lg py-2.5 text-sm font-bold text-white transition-colors sm:w-auto sm:px-6 shadow-sm ${
                  confirmChecked ? "bg-red-600 hover:bg-red-700" : "cursor-not-allowed bg-red-300"
                }`}
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------- Small custom icons ------------------- */
function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" className="text-black">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  );
}

function PinterestIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" className="text-red-600">
      <path d="M9.04 21.54c.96.29 1.93.46 2.96.46a10 10 0 0 0 10-10A10 10 0 0 0 12 2 10 10 0 0 0 2 12c0 4.25 2.67 7.9 6.44 9.34-.09-.8-.16-2.02.03-2.88l1.10-4.63s-.27-.54-.27-1.33c0-1.25.72-2.18 1.62-2.18.76 0 1.13.57 1.13 1.26 0 .76-.49 1.91-.74 2.96-.21.89.44 1.61 1.31 1.61 1.57 0 2.78-1.66 2.78-4.05 0-2.12-1.52-3.59-3.70-3.59-2.70 0-4.27 2.02-4.27 4.10 0 .81.31 1.68.70 2.15.08.09.09.17.07.26l-.26 1.07c-.04.17-.14.21-.32.13-1.17-.54-1.90-2.24-1.90-3.60 0-2.93 2.13-5.63 6.14-5.63 3.22 0 5.73 2.30 5.73 5.38 0 3.21-2.02 5.79-4.83 5.79-.94 0-1.82-.49-2.12-.93l-.58 2.20c-.21.80-.77 1.80-1.14 2.41z" />
    </svg>
  );
}