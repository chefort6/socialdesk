"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation"; // Add usePathname
import Cookies from "js-cookie";
import { createPortal } from "react-dom";
import { Search, Bell, User, Menu, ChevronDown, LogOut, CheckCircle2, AlertCircle, MessageSquare } from "lucide-react";

export default function Navbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const router = useRouter();
  const pathname = usePathname(); // Get current path
  
  // UI States
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [notificationsMenuStyle, setNotificationsMenuStyle] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);
  
  // Refs for click-outside handling
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const notificationsMenuRef = useRef<HTMLDivElement>(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState("");

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Determine if search bar should be shown
  const showSearchBar = pathname === '/posts' || pathname.startsWith('/posts/');

  // Define Notification Type
  type Notification = {
    id: number;
    type: string;
    title: string;
    message: string;
    created_at: string;
    is_read: boolean;
  };

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications?limit=5', { credentials: 'include' });
      const envelope = await res.json();
      const data = envelope?.data ?? envelope;
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      const clickedNotificationsTrigger = notificationsRef.current?.contains(e.target as Node);
      const clickedNotificationsMenu = notificationsMenuRef.current?.contains(e.target as Node);
      if (!clickedNotificationsTrigger && !clickedNotificationsMenu) {
        setNotificationsOpen(false);
        setNotificationsMenuStyle(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!notificationsOpen) return;

    const handleViewportChange = () => {
      setNotificationsOpen(false);
      setNotificationsMenuStyle(null);
    };

    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [notificationsOpen]);

  const handleLogout = () => {
    setShowLogoutModal(false);
    setUserMenuOpen(false);
    Cookies.remove("auth-token");
    Cookies.remove("user-role"); // Clean up admin cookie too
    Cookies.remove("user-id");
    router.push("/login");
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications/mark-all-read', { method: 'PUT', credentials: 'include' });
      fetchNotifications();
    } catch (error) {
      console.error(error);
    }
  };

  // Helper for notification icons
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 size={16} className="text-green-500" />;
      case 'alert': return <AlertCircle size={16} className="text-red-500" />;
      case 'social': return <MessageSquare size={16} className="text-blue-500" />;
      default: return <Bell size={16} className="text-gray-500" />;
    }
  };

  const closeNotificationsMenu = () => {
    setNotificationsOpen(false);
    setNotificationsMenuStyle(null);
  };

  const getNotificationsMenuStyle = (trigger: HTMLElement) => {
    const rect = trigger.getBoundingClientRect();
    const viewportPadding = 12;
    const width = Math.min(window.innerWidth - viewportPadding * 2, window.innerWidth < 640 ? 320 : 384);
    const left = Math.min(
      window.innerWidth - width - viewportPadding,
      Math.max(viewportPadding, rect.right - width)
    );
    const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
    const spaceAbove = rect.top - viewportPadding;

    if (spaceBelow >= 260 || spaceBelow >= spaceAbove) {
      const top = rect.bottom + 12;
      return {
        top,
        left,
        width,
        maxHeight: Math.max(180, window.innerHeight - top - viewportPadding),
      };
    }

    const maxHeight = Math.max(180, Math.min(420, spaceAbove - 12));
    const top = Math.max(viewportPadding, rect.top - maxHeight - 12);

    return {
      top,
      left,
      width,
      maxHeight,
    };
  };

   return (
    <>
      <header className="bg-white/50 backdrop-blur-sm border-b border-gray-100 h-20 px-4 md:px-8 flex items-center justify-between sticky top-0 z-40">
        
        {/* 1. Left Side: Hamburger (Mobile) + Search (conditionally) */}
        <div className="flex items-center gap-2 md:gap-4 flex-1">
          
          {/* The Hamburger Button */}
          <button 
            onClick={onMenuClick}
            className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg md:hidden transition-colors"
          >
            <Menu size={24} />
          </button>

        </div>

        {/* 2. Right Actions */}
        <div className="flex items-center gap-3 md:gap-6 shrink-0">
          
          {/* Notifications Dropdown */}
          <div className="relative" ref={notificationsRef}>
            <button 
              onClick={(e) => {
                if (notificationsOpen) {
                  closeNotificationsMenu();
                  return;
                }

                setNotificationsMenuStyle(getNotificationsMenuStyle(e.currentTarget));
                setNotificationsOpen(true);
                setUserMenuOpen(false); // Close user menu if open
              }}
              className={`relative text-primary hover:bg-blue-50 p-2 rounded-full transition-colors cursor-pointer ${notificationsOpen ? 'bg-blue-50' : ''}`}
            >
              <Bell size={24} />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
              )}
            </button>

          </div>

          {/* User Menu Dropdown */}
          <div className="relative pl-4 md:pl-6 border-l border-gray-200" ref={userMenuRef}>
            <button
              onClick={() => {
                setUserMenuOpen(!userMenuOpen);
                closeNotificationsMenu(); // Close notifications if open
              }}
              className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity focus:outline-none"
              aria-expanded={userMenuOpen}
              aria-haspopup="true"
            >
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white overflow-hidden shrink-0 shadow-sm">
                <User size={24} /> 
              </div>
              <div className="hidden md:flex items-center gap-1.5">
                {/* BACKEND NOTE: Dynamically populate these fields via API (e.g. GET /api/users/me) or decode them from the active JWT token. */}
                <div>
                  <p className="text-sm font-bold text-gray-900 leading-none text-left">John Doe</p>
                  <p className="text-[11px] text-gray-500 mt-1 text-left">johndoe@gmail.com</p>
                </div>
                <ChevronDown size={16} className={`text-gray-400 transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
              </div>
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-3 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1.5 overflow-hidden">
                {/* Mobile-only: show name in dropdown */}
                <div className="md:hidden px-4 py-2.5 border-b border-gray-100">
                  <p className="text-sm font-bold text-gray-900">John Doe</p>
                  <p className="text-xs text-gray-500">johndoe@gmail.com</p>
                </div>
                <button
                  onClick={() => { setUserMenuOpen(false); router.push("/profile"); }} 
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <User size={16} className="text-gray-400 shrink-0" /> Profile
                </button>
                <div className="border-t border-gray-100 my-1" />
                <button
                  onClick={() => { setUserMenuOpen(false); setShowLogoutModal(true); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                >
                  <LogOut size={16} className="text-red-400 shrink-0" /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {isMounted && notificationsOpen && notificationsMenuStyle && createPortal(
        <>
          <div className="fixed inset-0 z-40" onClick={closeNotificationsMenu} />
          <div
            ref={notificationsMenuRef}
            style={{
              position: "fixed",
              top: notificationsMenuStyle.top,
              left: notificationsMenuStyle.left,
              width: notificationsMenuStyle.width,
              maxHeight: notificationsMenuStyle.maxHeight,
              minHeight: 0,
              zIndex: 50,
            }}
            className="bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden flex flex-col"
          >
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 gap-3">
              <h3 className="font-bold text-gray-900 truncate">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-primary font-medium hover:underline cursor-pointer shrink-0"
                >
                  Mark all as read
                </button>
              )}
            </div>

            <div className="overflow-y-auto flex-1">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-gray-500 text-sm">
                  No new notifications.
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-gray-50">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`px-4 py-3 flex gap-3 hover:bg-gray-50 transition-colors cursor-pointer ${!notification.is_read ? 'bg-blue-50/30' : ''}`}
                      onClick={async () => {
                        if (!notification.is_read) {
                          await fetch(`/api/notifications/${notification.id}/read`, { method: 'PUT', credentials: 'include' });
                          fetchNotifications();
                        }
                      }}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${!notification.is_read ? 'bg-white shadow-sm' : 'bg-gray-100'}`}>
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm leading-tight mb-0.5 ${!notification.is_read ? 'font-bold text-gray-900' : 'font-medium text-gray-800'}`}>
                          {notification.title}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{notification.message}</p>
                        <p className="text-[10px] text-gray-400 mt-1">{new Date(notification.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                      </div>
                      {!notification.is_read && (
                        <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0"></div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-2 border-t border-gray-100 bg-white">
              <button
                onClick={() => {
                  closeNotificationsMenu();
                  router.push("/notifications");
                }}
                className="w-full py-2 text-xs font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
              >
                View all notifications
              </button>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-100 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowLogoutModal(false)}
          />
          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-[90%] max-w-sm p-6 sm:p-8 text-center overflow-hidden">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
              <LogOut size={28} className="text-red-500" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Sign out?</h2>
            <p className="text-sm text-gray-500 mb-6">Are you sure you want to log out of your account?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-sm font-semibold text-white hover:bg-red-600 transition-colors cursor-pointer"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
