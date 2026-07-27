
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function sanitizeSearch(input: string | null, maxLength = 100): string {
  if (!input) return '';
  return escapeRegex(input.trim().slice(0, maxLength));
}

export function isValidObjectId(id: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(id);
}
