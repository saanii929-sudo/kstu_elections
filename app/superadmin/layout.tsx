"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AUTH_EXPIRED_EVENT, isTokenExpired } from "@/lib/authFetch";
import {
  LayoutGrid,
  Building2,
  DollarSign,
  CreditCard,
  CalendarDays,
  Percent,
} from "lucide-react";
import AdminSidebar from "@/components/AdminSidebar";
import { UIProvider } from "@/context/ui-context";
import { Toaster } from "react-hot-toast";
import AdminTopBar from "@/components/AdminTopBar";


const metadata = {
  title: "KsTU-Evote SuperAdmin Dashboard",
  description: "Manage organizations, service fees, and platform revenue.",
};

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const isLoginPage = pathname === "/superadmin/login";

  useEffect(() => {
    if (isLoginPage) {
      setLoading(false);
      return;
    }

    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (!token || !userData || isTokenExpired()) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("tokenTimestamp");
      router.push("/superadmin/login");
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== "superadmin") {
      router.push("/dashboard");
      return;
    }

    setUser(parsedUser);
    setLoading(false);

    // Real-time expiry: redirect immediately when any API call returns 401
    const handleExpired = () => router.push("/superadmin/login");
    window.addEventListener(AUTH_EXPIRED_EVENT, handleExpired);

    // Proactive check every 30 s — catches expiry even when user is idle
    const interval = setInterval(() => {
      if (isTokenExpired()) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("tokenTimestamp");
        router.push("/superadmin/login");
      }
    }, 30_000);

    return () => {
      window.removeEventListener(AUTH_EXPIRED_EVENT, handleExpired);
      clearInterval(interval);
    };
  }, [router, isLoginPage, pathname]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/superadmin/login");
  };

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (loading || !user) {
    return null;
  }

  const menu = [
    { name: "Dashboard", href: "/superadmin", icon: LayoutGrid },
    {
      name: "Organizations",
      href: "/superadmin/organizations",
      icon: Building2,
    },
    { name: "Event Organizers", href: "/superadmin/event-organizers", icon: CalendarDays },
  ];

  return (
    <UIProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: "#fff",
            color: "#363636",
            padding: "16px",
            borderRadius: "8px",
            fontSize: "14px",
          },
          success: {
            iconTheme: {
              primary: "#16a34a",
              secondary: "#fff",
            },
          },
          error: {
            iconTheme: {
              primary: "#dc2626",
              secondary: "#fff",
            },
          },
        }}
      />
      <div className="flex min-h-screen bg-gray-50">
        <AdminSidebar />
        <div className="flex-1 flex flex-col">
          <AdminTopBar />
          <main className="p-4 md:px-24">{children}</main>
        </div>
      </div>
    </UIProvider>
  );
}
