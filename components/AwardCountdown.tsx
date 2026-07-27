"use client";
import { useState, useEffect } from "react";

interface CountdownProps {
  startDate?: string;
  endDate?: string;
  votingStartDate?: string;
  votingEndDate?: string;
  votingStartTime?: string;
  votingEndTime?: string;
  status?: string;
  stageStartDate?: string;
  stageEndDate?: string;
  stageStartTime?: string;
  stageEndTime?: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

const AwardCountdown = ({
  votingStartDate,
  votingEndDate,
  votingStartTime,
  votingEndTime,
  stageStartDate,
  stageEndDate,
  stageStartTime,
  stageEndTime,
}: CountdownProps) => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    total: 0,
  });
  const [phase, setPhase] = useState<"upcoming" | "voting" | "ended">("upcoming");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();

      let votingStart: Date | null = null;
      let votingEnd: Date | null = null;

      if (stageStartDate && stageEndDate) {
        votingStart = new Date(stageStartDate);
        if (stageStartTime) {
          const [h, m] = stageStartTime.split(":");
          votingStart.setHours(parseInt(h), parseInt(m), 0, 0);
        }
        votingEnd = new Date(stageEndDate);
        if (stageEndTime) {
          const [h, m] = stageEndTime.split(":");
          votingEnd.setHours(parseInt(h), parseInt(m), 0, 0);
        }
      } else if (votingStartDate && votingEndDate) {
        votingStart = new Date(votingStartDate);
        if (votingStartTime) {
          const [h, m] = votingStartTime.split(":");
          votingStart.setHours(parseInt(h), parseInt(m), 0, 0);
        }
        votingEnd = new Date(votingEndDate);
        if (votingEndTime) {
          const [h, m] = votingEndTime.split(":");
          votingEnd.setHours(parseInt(h), parseInt(m), 0, 0);
        }
      }

      let targetDate: Date | null = null;
      let currentPhase: "upcoming" | "voting" | "ended" = "upcoming";

      if (votingEnd && now > votingEnd.getTime()) {
        currentPhase = "ended";
        targetDate = votingEnd;
      } else if (votingStart && now >= votingStart.getTime() && votingEnd && now < votingEnd.getTime()) {
        currentPhase = "voting";
        targetDate = votingEnd;
      } else if (votingStart && now < votingStart.getTime()) {
        currentPhase = "upcoming";
        targetDate = votingStart;
      }

      setPhase(currentPhase);

      if (!targetDate) return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };

      const difference = targetDate.getTime() - now;
      if (difference <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        total: difference,
      };
    };

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    setTimeLeft(calculateTimeLeft());
    return () => clearInterval(timer);
  }, [votingStartDate, votingEndDate, votingStartTime, votingEndTime, stageStartDate, stageEndDate, stageStartTime, stageEndTime]);

  if (!mounted || phase === "upcoming") return null;

  const units = [
    { value: timeLeft.days, label: "Days" },
    { value: timeLeft.hours, label: "Hours" },
    { value: timeLeft.minutes, label: "Minutes" },
    { value: timeLeft.seconds, label: "Seconds" },
  ];

  return (
    <div className="flex items-start gap-3 sm:gap-4">
      {units.map((unit) => (
        <div key={unit.label} className="flex flex-col items-center gap-1.5">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl border-2 border-green-400 bg-green-100 flex items-center justify-center">
            <span className="text-xl sm:text-2xl font-bold text-green-500 tabular-nums">
              {String(unit.value).padStart(2, "0")}
            </span>
          </div>
          <span className="text-xs text-gray-500 font-medium">{unit.label}</span>
        </div>
      ))}
    </div>
  );
};

export default AwardCountdown;
