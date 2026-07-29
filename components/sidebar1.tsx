"use client";

import {
  LayoutGrid,
  Award,
  Calendar,
  Building2,
  ChevronDown,
  X,
  Edit3,
  FolderOpen,
  Users,
  FileText,
  Vote,
  Layers,
  BarChart3,
  ArrowRightLeft,
  CreditCard,
  CalendarDays,
  Clock,
  CheckSquare,
  UserCircle,
  UserCog,
  Settings,
  Target,
  MessageCircle,
  UserCheck,
  Headphones,
  MonitorSmartphone,
} from "lucide-react";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useUI } from "@/context/ui-context";

const menu = [
  { name: "Overview", href: "/election-dashboard", icon: LayoutGrid },
  { name: "Elections", href: "/election-dashboard/elections", icon: Vote },
  {
    name: "Positions",
    href: "/election-dashboard/positions",
    icon: BarChart3,
  },
  {
    name: "Candidates",
    href: "/election-dashboard/candidates",
    icon: UserCheck,
  },
  { name: "Voters", href: "/election-dashboard/voters", icon: Users },
  { name: "Results", href: "/election-dashboard/results", icon: BarChart3 },
  { name: "Agents", href: "/election-dashboard/agents", icon: UserCog },
  { name: "Reports", href: "/election-dashboard/reports", icon: FileText },
  { name: "Help Desk", href: "/election-dashboard/helpdesk", icon: Headphones },
  { name: "Sessions", href: "/election-dashboard/sessions", icon: MonitorSmartphone },
  { name: "Profile", href: "/election-dashboard/profile", icon: UserCircle },
];

export default function Sidebar1() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useUI();
  const [openDropdowns, setOpenDropdowns] = useState<string[]>([]);
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
    // Help desk sub-accounts are single-organization-scoped and managed by
    // the org owner — structurally incompatible with an electionAdmin whose
    // assigned elections may belong to different organizations, and not
    // part of an electionAdmin's granted access.
    if (userRole === "electionAdmin" && item.name === "Help Desk") {
      return false;
    }
    return true;
  });

  const SidebarContent = (
    <div className="w-64 relative bg-[#1C2338] h-full px-6 py-8">
      <div className="flex items-center justify-between mb-10">
        <a href="/election-dashboard" className="flex items-center justify-center gap-2">
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
