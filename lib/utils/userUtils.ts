/**
 * Get user initials from display name
 * @param displayName - The user's display name
 * @returns Two-letter initials (e.g., "John Doe" -> "JD")
 */
export function getUserInitials(displayName: string | null | undefined): string {
  if (!displayName) {
    return '??';
  }

  const parts = displayName.trim().split(/\s+/);

  if (parts.length === 0) {
    return '??';
  }

  if (parts.length === 1) {
    // Single name - use first two characters
    return parts[0].substring(0, 2).toUpperCase();
  }

  // Multiple parts - use first character of first and last part
  const first = parts[0][0] || '';
  const last = parts[parts.length - 1][0] || '';
  return (first + last).toUpperCase();
}
