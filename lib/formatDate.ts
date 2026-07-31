// Election dates are always displayed in a fixed timezone (Ghana/GMT — the
// same offset year-round, no DST) rather than each viewer's own device
// timezone. Relying on the device would mean a machine with a misconfigured
// system clock/timezone shows a different wall-clock time than everyone
// else for the exact same election — e.g. "Ends 8:00 AM" on one machine and
// the correct time on another, even though the stored value never changed.
const ELECTION_TIME_ZONE = "Africa/Accra";

export function formatElectionDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: ELECTION_TIME_ZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(date));
}

export function formatElectionDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: ELECTION_TIME_ZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export function formatElectionTime(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: ELECTION_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(date));
}
