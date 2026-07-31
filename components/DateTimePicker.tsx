"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, Clock } from "lucide-react";

interface DateTimePickerProps {
  // Same value shape as a native <input type="datetime-local">:
  // "" | "YYYY-MM-DDTHH:mm", always local time — safe drop-in replacement.
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
  placeholder?: string;
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const POPOVER_WIDTH = 300;
const ASSUMED_POPOVER_HEIGHT = 430;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function parseValue(value?: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function stripTime(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function clampDate(date: Date, min: Date | null, max: Date | null): Date {
  let result = date;
  if (min && result < min) result = min;
  if (max && result > max) result = max;
  return result;
}

function buildMonthGrid(viewDate: Date) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const startWeekday = new Date(year, month, 1).getDay();
  const cells: { date: Date; inMonth: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const date = new Date(year, month, i - startWeekday + 1);
    cells.push({ date, inMonth: date.getMonth() === month });
  }
  return cells;
}

function formatDisplay(date: Date): string {
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function DateTimePicker({
  value,
  onChange,
  min,
  max,
  disabled,
  placeholder = "Select date & time",
}: DateTimePickerProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const selected = parseValue(value);
  const minDate = parseValue(min);
  const maxDate = parseValue(max);
  const [viewDate, setViewDate] = useState<Date>(selected || minDate || new Date());

  useEffect(() => {
    if (open) setViewDate(selected || minDate || new Date());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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
      const openUpward = spaceBelow < ASSUMED_POPOVER_HEIGHT && spaceAbove > spaceBelow;
      const left = Math.min(rect.left, window.innerWidth - POPOVER_WIDTH - 12);
      setCoords({
        top: openUpward ? Math.max(8, rect.top - ASSUMED_POPOVER_HEIGHT - 8) : rect.bottom + 8,
        left: Math.max(12, left),
      });
    }
    if (open) {
      reposition();
      window.addEventListener("resize", reposition);
      // Any ancestor scroll (including inside a scrollable modal) — bail
      // rather than track a stale position.
      const closeOnScroll = () => setOpen(false);
      window.addEventListener("scroll", closeOnScroll, true);
      return () => {
        window.removeEventListener("resize", reposition);
        window.removeEventListener("scroll", closeOnScroll, true);
      };
    }
  }, [open]);

  const commit = (date: Date) => {
    onChange(toValue(clampDate(date, minDate, maxDate)));
  };

  const isDayDisabled = (day: Date) => {
    const d = stripTime(day);
    if (minDate && d < stripTime(minDate)) return true;
    if (maxDate && d > stripTime(maxDate)) return true;
    return false;
  };

  const handleDayClick = (day: Date) => {
    if (isDayDisabled(day)) return;
    const base = selected || new Date();
    commit(new Date(day.getFullYear(), day.getMonth(), day.getDate(), base.getHours(), base.getMinutes()));
  };

  const handleTimeChange = (hour24: number, minute: number) => {
    const base = selected || viewDate;
    commit(new Date(base.getFullYear(), base.getMonth(), base.getDate(), hour24, minute));
  };

  const applyPreset = (getDate: () => Date) => {
    commit(getDate());
    setOpen(false);
  };

  const cells = buildMonthGrid(viewDate);
  const today = stripTime(new Date());

  const hour12 = selected ? (selected.getHours() % 12 === 0 ? 12 : selected.getHours() % 12) : 9;
  const minute = selected ? selected.getMinutes() : 0;
  const period: "AM" | "PM" = selected && selected.getHours() >= 12 ? "PM" : "AM";

  const setHour12 = (h: number) => handleTimeChange((h % 12) + (period === "PM" ? 12 : 0), minute);
  const setMinute = (m: number) => handleTimeChange((hour12 % 12) + (period === "PM" ? 12 : 0), m);
  const setPeriod = (p: "AM" | "PM") => handleTimeChange((hour12 % 12) + (p === "PM" ? 12 : 0), minute);

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 border rounded-lg text-left bg-white focus:outline-none focus:ring-2 focus:ring-[#d4af37] disabled:bg-gray-50 disabled:cursor-not-allowed"
      >
        <span className={selected ? "text-gray-900 text-sm" : "text-gray-400 text-sm"}>
          {selected ? formatDisplay(selected) : placeholder}
        </span>
        <Calendar size={16} className="text-gray-400 shrink-0" />
      </button>

      {open && coords && (
        <div
          ref={popoverRef}
          style={{ position: "fixed", top: coords.top, left: coords.left, width: POPOVER_WIDTH }}
          className="z-[70] bg-white rounded-xl shadow-2xl border border-gray-100 p-4 max-h-[calc(100vh-24px)] overflow-y-auto"
        >
          {/* Month nav */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
            >
              <ChevronLeft size={16} />
            </button>
            <p className="text-sm font-semibold text-gray-900">
              {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
            </p>
            <button
              type="button"
              onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Weekday header */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map((d) => (
              <div key={d} className="text-center text-[11px] font-semibold text-gray-400">
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-0.5 mb-3">
            {cells.map(({ date, inMonth }, i) => {
              const dayDisabled = isDayDisabled(date);
              const isSelected = !!selected && stripTime(date).getTime() === stripTime(selected).getTime();
              const isToday = stripTime(date).getTime() === today.getTime();
              return (
                <button
                  type="button"
                  key={i}
                  disabled={dayDisabled}
                  onClick={() => handleDayClick(date)}
                  className={`h-8 w-8 mx-auto flex items-center justify-center text-xs rounded-full transition
                    ${!inMonth ? "text-gray-300" : "text-gray-700"}
                    ${dayDisabled ? "opacity-30 cursor-not-allowed" : "hover:bg-amber-50 cursor-pointer"}
                    ${isSelected ? "bg-[#d4af37] text-white font-bold hover:bg-[#d4af37]" : ""}
                    ${isToday && !isSelected ? "ring-1 ring-[#d4af37] font-semibold" : ""}
                  `}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          {/* Time selection */}
          <div className="flex items-center gap-1.5 border-t border-gray-100 pt-3">
            <Clock size={14} className="text-gray-400 shrink-0" />
            <select
              value={hour12}
              onChange={(e) => setHour12(Number(e.target.value))}
              className="flex-1 min-w-0 px-2 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                <option key={h} value={h}>
                  {pad(h)}
                </option>
              ))}
            </select>
            <span className="text-gray-400">:</span>
            <select
              value={minute}
              onChange={(e) => setMinute(Number(e.target.value))}
              className="flex-1 min-w-0 px-2 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
            >
              {Array.from({ length: 60 }, (_, i) => i).map((m) => (
                <option key={m} value={m}>
                  {pad(m)}
                </option>
              ))}
            </select>
            <div className="flex items-center bg-gray-100 rounded-lg p-0.5 shrink-0">
              {(["AM", "PM"] as const).map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                    period === p ? "bg-[#d4af37] text-white shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Quick presets */}
          <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() =>
                applyPreset(() => {
                  const d = new Date();
                  d.setHours(d.getHours() + 1);
                  return d;
                })
              }
              className="px-2.5 py-1 rounded-full bg-gray-100 hover:bg-amber-50 text-xs text-gray-600 font-medium transition"
            >
              In 1 hour
            </button>
            <button
              type="button"
              onClick={() =>
                applyPreset(() => {
                  const d = new Date();
                  d.setDate(d.getDate() + 1);
                  d.setHours(9, 0, 0, 0);
                  return d;
                })
              }
              className="px-2.5 py-1 rounded-full bg-gray-100 hover:bg-amber-50 text-xs text-gray-600 font-medium transition"
            >
              Tomorrow 9 AM
            </button>
            <button
              type="button"
              onClick={() =>
                applyPreset(() => {
                  const d = new Date();
                  d.setDate(d.getDate() + 3);
                  d.setHours(9, 0, 0, 0);
                  return d;
                })
              }
              className="px-2.5 py-1 rounded-full bg-gray-100 hover:bg-amber-50 text-xs text-gray-600 font-medium transition"
            >
              In 3 days
            </button>
          </div>

          <div className="flex justify-end mt-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-[#1C2338] rounded-lg hover:bg-[#1C2338]/90 transition"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
}
