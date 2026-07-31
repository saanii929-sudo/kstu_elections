export type ElectionStatusKey = "scheduled" | "live" | "closed";

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
 * Derives the display status of an election purely from its schedule — mirrors
 * the date-only gating that voter eligibility (lib/voterEligibility.ts) and
 * vote-casting already use, so the badge never disagrees with what voters can
 * actually do. Stored `status` only matters for early termination ("ended").
 */
export function getElectionStatus(election: ElectionLike): ElectionStatusKey {
  const now = new Date();
  const start = new Date(election.startDate);
  const end = new Date(election.endDate);

  if (election.status === "ended" || now > end) return "closed";
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
