"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Shows an inline filter box in the popover. Defaults to on — pass false
   *  to hide it for short, fixed lists (e.g. a 2-option Yes/No select). */
  searchable?: boolean;
}

const POPOVER_MAX_HEIGHT = 320;

export default function Select({
  value,
  onChange,
  options,
  placeholder = "Select…",
  disabled,
  className = "",
  searchable,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value) || null;
  const showSearch = searchable ?? true;
  const filtered = showSearch && query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  useEffect(() => {
    if (open && showSearch) {
      const id = setTimeout(() => searchRef.current?.focus(), 10);
      return () => clearTimeout(id);
    }
  }, [open, showSearch]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    function reposition() {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const openUpward = spaceBelow < POPOVER_MAX_HEIGHT && spaceAbove > spaceBelow;
      setCoords({
        top: openUpward ? Math.max(8, rect.top - Math.min(POPOVER_MAX_HEIGHT, spaceAbove - 12) - 8) : rect.bottom + 6,
        left: rect.left,
        width: rect.width,
      });
    }
    if (open) {
      reposition();
      window.addEventListener("resize", reposition);
      const closeOnScroll = () => setOpen(false);
      window.addEventListener("scroll", closeOnScroll, true);
      return () => {
        window.removeEventListener("resize", reposition);
        window.removeEventListener("scroll", closeOnScroll, true);
      };
    }
  }, [open]);

  const commit = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        disabled={disabled}
        onClick={() => {
          setOpen((o) => !o);
          setQuery("");
        }}
        className={`group w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl border text-left text-sm font-medium transition-all
          bg-white  border-gray-200  text-gray-900  shadow-sm
          hover:border-gray-300 
          focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-transparent
          disabled:bg-gray-50  disabled:text-gray-400 disabled:cursor-not-allowed disabled:hover:border-gray-200
          ${open ? "ring-2 ring-[#d4af37] border-transparent" : ""} ${className}`}
      >
        <span className={`truncate ${selected ? "" : "text-gray-400 dark:text-gray-500 font-normal"}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-gray-400 transition-transform duration-200 ${open ? "rotate-180 text-[#d4af37]" : "group-hover:text-gray-500"}`}
        />
      </button>

      {open && coords && (
        <div
          ref={popoverRef}
          style={{ position: "fixed", top: coords.top, left: coords.left, width: coords.width }}
          className="z-70 bg-white  rounded-xl shadow-xl border border-gray-100  overflow-hidden"
        >
          {showSearch && (
            <div className="p-2 border-b border-gray-100 ">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search…"
                  className="w-full pl-8 pr-2 py-1.5 text-sm bg-gray-50  border border-gray-200  rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37] text-gray-900"
                />
              </div>
            </div>
          )}
          <div className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-4 py-3 text-sm text-gray-400 text-center">No matches</p>
            ) : (
              filtered.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    type="button"
                    key={opt.value}
                    onClick={() => commit(opt.value)}
                    className={`w-full flex items-center justify-between gap-2 px-4 py-2 text-sm text-left transition-colors
                      ${isSelected
                        ? "bg-amber-50 text-[#d4af37] font-semibold"
                        : "text-gray-700  hover:bg-gray-50 "}`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && <Check size={15} className="shrink-0 text-[#d4af37]" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </>
  );
}
