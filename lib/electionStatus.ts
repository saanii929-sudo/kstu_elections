export type ElectionStatusKey = "draft" | "scheduled" | "pending" | "live" | "closed";

export interface ElectionLike {
  status: string;
  startDate: string | Date;
  endDate: string | Date;
}

export interface ElectionStatusInfo {
  key: ElectionStatusKey;
  label: string;
  dotColor: string;
  badgeClass: string;
}

/**
 * Derives the display status of an election from its stored status plus schedule.
 * "pending" covers an election left in draft whose start time has already arrived —
 * it should be live but is waiting on an admin to activate it.
 */
export function getElectionStatus(election: ElectionLike): ElectionStatusKey {
  const now = new Date();
  const start = new Date(election.startDate);
  const end = new Date(election.endDate);

  if (election.status === "ended" || now > end) return "closed";

  if (election.status === "draft") {
    return now >= start ? "pending" : "draft";
  }

  if (now < start) return "scheduled";
  return "live";
}

const ELECTION_STATUS_META: Record<ElectionStatusKey, Omit<ElectionStatusInfo, "key">> = {
  live: {
    label: "Live",
    dotColor: "bg-emerald-500",
    badgeClass:
      "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/30",
  },
  pending: {
    label: "Pending",
    dotColor: "bg-amber-500",
    badgeClass:
      "bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/30",
  },
  draft: {
    label: "Draft",
    dotColor: "bg-gray-400",
    badgeClass:
      "bg-gray-100 text-gray-600 ring-1 ring-gray-200 dark:bg-gray-500/10 dark:text-gray-300 dark:ring-gray-500/30",
  },
  scheduled: {
    label: "Scheduled",
    dotColor: "bg-blue-500",
    badgeClass:
      "bg-blue-50 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/30",
  },
  closed: {
    label: "Closed",
    dotColor: "bg-red-500",
    badgeClass:
      "bg-red-50 text-red-600 ring-1 ring-red-200 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/30",
  },
};

export function getElectionStatusInfo(election: ElectionLike): ElectionStatusInfo {
  const key = getElectionStatus(election);
  return { key, ...ELECTION_STATUS_META[key] };
}

export const ALIAS_PATTERN = /^[A-Z0-9][A-Z0-9-]{1,19}$/;

export function normalizeAlias(raw: string): string {
  return raw.trim().toUpperCase();
}

export function isValidAlias(alias: string): boolean {
  return ALIAS_PATTERN.test(alias);
}
