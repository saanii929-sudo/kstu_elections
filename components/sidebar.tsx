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
  CheckSquare,
  UserCircle,
  UserCog,
  Settings,
  Target,
  UserCheck,
} from "lucide-react";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useUI } from "@/context/ui-context";

const menu = [
  {
    name: "Overview",
    href: "/dashboard",
    icon: LayoutGrid,
  },
  {
    name: "Analytics",
    href: "/dashboard/analytics",
    icon: BarChart3,
  },
  {
    name: "Campaigns",
    href: "/dashboard/campaigns",
    icon: Target,
  },
  {
    name: "Awards",
    icon: Award,
    children: [
      { name: "Edit Awards", href: "/dashboard/awards", icon: Edit3 },
      {
        name: "Category",
        href: "/dashboard/awards/category",
        icon: FolderOpen,
      },
      { name: "Nominees", href: "/dashboard/awards/nominees", icon: Users },
      {
        name: "Nomination",
        href: "/dashboard/awards/nomination",
        icon: FileText,
      },
      {
        name: "Bulk Voting",
        href: "/dashboard/awards/bulk-voting",
        icon: Vote,
      },
      { name: "Stages", href: "/dashboard/awards/stages", icon: Layers },
      { name: "Votes", href: "/dashboard/awards/votes", icon: CheckSquare },
      { name: "Results", href: "/dashboard/awards/results", icon: BarChart3 },
      {
        name: "Transfer",
        href: "/dashboard/awards/transfer",
        icon: ArrowRightLeft,
      },
      {
        name: "Payments",
        href: "/dashboard/awards/payments",
        icon: CreditCard,
      },
    ],
  },
  {
    name: "Events",
    icon: Calendar,
    children: [
      { name: "All Events", href: "/dashboard/events", icon: Calendar },
      { name: "Transfers", href: "/dashboard/events/transfers", icon: ArrowRightLeft },
      { name: "Scanners", href: "/dashboard/events/scanners", icon: UserCheck },
    ],
  },
  {
    name: "Organization",
    icon: Building2,
    children: [
      { name: "My Organization", href: "/dashboard/organisation", icon: UserCircle },
      {
        name: "Join Organization",
        href: "/dashboard/organisation/join",
        icon: UserCog,
      },
      {
        name: "Admins",
        href: "/dashboard/organisation/admins",
        icon: Settings,
      },
    ],
  },
  {
    name: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useUI();
  const [openDropdowns, setOpenDropdowns] = useState<string[]>([]);
  const [userRole, setUserRole] = useState<string>('organization');
  const [hasAssignedEvents, setHasAssignedEvents] = useState(true); // default show until checked

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      const role = user.role || 'organization';
      setUserRole(role);

      // For org-admins, check if they have any assigned events
      if (role === 'org-admin') {
        const token = localStorage.getItem('token');
        fetch('/api/organization/my-assignments', {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((r) => r.json())
          .then((data) => {
            if (data.success) {
              setHasAssignedEvents(data.data.fullAccess || data.data.assignedEvents.length > 0);
            }
          })
          .catch(() => { /* non-critical */ });
      }
    }
  }, []);

  const filteredMenu = (() => {
    // Event-organizer: events management only, no awards/campaigns/organization
    if (userRole === 'event-organizer') {
      return menu.filter(item => ['Overview', 'Analytics', 'Events'].includes(item.name));
    }
    // Org-admin: filter based on assignments
    if (userRole === 'org-admin') {
      return menu
        .filter(item => hasAssignedEvents || item.name !== 'Events')
        .map(item => {
          if (item.name === 'Organization' && item.children) {
            return {
              ...item,
              children: item.children.filter(c =>
                c.name === 'My Organization' || c.name === 'Join Organization' || c.name === 'Admins'
              ),
            };
          }
          return item;
        });
    }
    return menu;
  })();

  const hasActiveChild = (children: any[]) =>
    children.some((child) => pathname === child.href);

  const toggleDropdown = (name: string) => {
    setOpenDropdowns((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    );
  };

  const SidebarContent = (
    <div className="w-64 relative bg-white h-full px-6 py-8">
      <div className="flex items-center justify-between mb-10">
        <a href="/" className="flex items-center gap-2">
          {" "}
          <Image
            src="/images/logo.png"
            alt="Pawavotes"
            width={70}
            height={70}
          />{" "}
          <span className="text-xl absolute left-22 top-13 font-semibold text-green-600">
            {" "}
            Pawavotes{" "}
          </span>{" "}
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
          const childActive = item.children && hasActiveChild(item.children);
          const isOpen =
            item.children && (openDropdowns.includes(item.name) || childActive);

          return (
            <div key={item.name} className="relative">
              {childActive && (
                <motion.div
                  layoutId="active-pill"
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-green-500 rounded-full"
                />
              )}

              {/* NORMAL LINK */}
              {!item.children && (
                <Link
                  href={item.href!}
                  className={`flex items-center text-sm gap-3 px-4 py-3 rounded-lg transition
                    ${
                      pathname === item.href
                        ? "bg-green-500 text-white"
                        : "text-gray-500 hover:bg-gray-100"
                    }
                  `}
                >
                  <Icon size={18} />
                  <span>{item.name}</span>
                </Link>
              )}

              {item.children && (
                <>
                  <div
                    onClick={() => toggleDropdown(item.name)}
                    className={`flex items-center justify-between px-4 py-3 rounded-lg cursor-pointer transition
                      ${
                        childActive
                          ? "bg-green-500 text-white"
                          : "text-gray-500 hover:bg-gray-100"
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={18} />
                      <span className="font-medium">{item.name}</span>
                    </div>
                    <ChevronDown
                      size={16}
                      className={`transition ${isOpen ? "rotate-180" : ""}`}
                    />
                  </div>

                  {/* CHILDREN */}
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="ml-10 mt-2 space-y-1"
                      >
                        {item.children.map((child) => {
                          const active = pathname === child.href;
                          const ChildIcon = child.icon;

                          return (
                            <Link
                              key={child.name}
                              href={child.href}
                              className={`flex items-center  gap-3 px-2 py-2 rounded-md text-sm transition
                                ${
                                  active
                                    ? "bg-green-50 text-green-600 font-medium"
                                    : "text-gray-500 hover:bg-gray-50"
                                }
                              `}
                            >
                              <ChildIcon size={16} />
                              <span>{child.name}</span>
                            </Link>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
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
