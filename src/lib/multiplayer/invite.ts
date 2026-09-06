/**
 * Invite-link helpers for live shared scoring. A game's shareable "room" is just
 * its id; the invite is `/?join=<roomId>`, handled by the index route.
 */

export function inviteLink(roomId: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/?join=${roomId}`;
}

/** Extract a room id from a pasted invite link or a bare code. Null if empty. */
export function parseRoomId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    const join = url.searchParams.get("join");
    if (join) return join.trim();
  } catch {
    // Not a URL — fall through and treat the whole string as a code.
  }
  const fromQuery = trimmed.match(/[?&]join=([^&\s]+)/);
  if (fromQuery) return decodeURIComponent(fromQuery[1]);
  return trimmed;
}
