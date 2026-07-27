"use client";

import { LayoutGrid, Building2, X, CreditCard, DollarSign, Percent, BarChart3, CalendarDays } from "lucide-react";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useUI } from "@/context/ui-context";

const menu = [
  { name: "Dashboard", href: "/superadmin", icon: LayoutGrid },
  { name: "Organizations", href: "/superadmin/organizations", icon: Building2 },
  { name: "Site Analytics", href: "/superadmin/analytics", icon: BarChart3 },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useUI();
  const [userRole, setUserRole] = useState<string>("organization");

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      const user = JSON.parse(userData);
      setUserRole(user.role || "organization");
    }
  }, []);

  const filteredMenu = menu.filter((item) => {
    if (userRole === "org-admin" && item.name === "Organization") {
      return false;
    }
    return true;
  });

  const SidebarContent = (
    <div className="w-64 relative bg-[#1C2338] h-full px-6 py-8">
      <div className="flex items-center justify-between mb-10">
        <a href="/superadmin" className="flex items-center justify-center gap-2">
          <h1 className="text-[#D4AF37] font-bold text-lg text-center">Kumasi Technical University</h1>
        </a>

        <button
          className="md:hidden absolute top-4 right-4 text-gray-400"
          onClick={() => setSidebarOpen(false)}
        >
          {" "}
          <X />{" "}
        </button>
      </div>

      {/* Menu */}
      <nav className="space-y-2">
        {filteredMenu.map((item) => {
          const Icon = item.icon;

          return (
            <div key={item.name} className="relative">
              <Link
                href={item.href!}
                className={`flex items-center text-sm gap-3 px-4 py-3 rounded-lg transition
                    ${
                      pathname === item.href
                        ? "bg-[#D4AF37] text-white"
                        : "text-white hover:bg-[#1C2338]"
                    }
                  `}
              >
                <Icon size={18} />
                <span>{item.name}</span>
              </Link>
            </div>
          );
        })}
      </nav>
    </div>
  );

  return (
    <>
      <div className="hidden md:block">{SidebarContent}</div>

      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/40 z-40 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 md:hidden"
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
            >
              {SidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
