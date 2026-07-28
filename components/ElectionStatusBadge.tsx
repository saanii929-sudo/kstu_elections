import { getElectionStatusInfo, ElectionLike } from "@/lib/electionStatus";

export default function ElectionStatusBadge({
  election,
  className = "",
}: {
  election: ElectionLike;
  className?: string;
}) {
  const { key, label, dotColor, badgeClass } = getElectionStatusInfo(election);

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 ${badgeClass} ${className}`}
    >
      <span className="relative flex h-2 w-2">
        {key === "live" && (
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotColor}`}
          />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${dotColor}`} />
      </span>
      {label}
    </span>
  );
}
