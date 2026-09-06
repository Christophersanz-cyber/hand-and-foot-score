-- WebRTC signaling relay for live shared scoring (see src/lib/multiplayer/).
--
-- The app is otherwise device-local; these tables exist only to broker the
-- WebRTC handshake between two browsers that want to score the SAME game
-- together. Once the peers connect, score data flows browser-to-browser and
-- never touches this database — so the rows here are tiny and short-lived.
--
-- A "room" is a game's shareable id. `rtc_peers` is the room roster (who is
-- currently present); `rtc_signals` is the offer/answer/ICE mailbox addressed
-- from one peer to another. Both are self-cleaning: every poll drops peers that
-- have gone quiet and signals older than a minute, so no cron is required.
--
-- NOTE: cross-device signaling in production needs a real DATABASE_URL (Neon).
-- The PGLite fallback is per-serverless-instance, so two phones hitting two
-- different instances would not see each other's rows. Local dev is a single
-- instance, so two tabs/contexts sync fine against PGLite — see README.md.

create table if not exists rtc_peers (
  room text not null,
  id text not null,
  name text not null default '',
  last_seen timestamptz not null default now(),
  primary key (room, id)
);

create table if not exists rtc_signals (
  id bigserial primary key,
  room text not null,
  from_peer text not null,
  to_peer text not null,
  kind text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists rtc_signals_room_to_idx on rtc_signals (room, to_peer, id);
create index if not exists rtc_peers_last_seen_idx on rtc_peers (last_seen);
