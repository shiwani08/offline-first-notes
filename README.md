# Offline-First Notes App — Single User, Multi-Device

A text-only, Google Keep–style notes app that works fully offline on every device and syncs changes between a single user's devices whenever a connection is available. There is only ever one human using the system — but that human may have a phone, a laptop, and possibly more devices in the future, all editing the same notes independently and offline.

**Core challenge:** when the same note is edited or deleted differently on two devices before they've synced with each other, which version wins — and how do we guarantee every device agrees on the answer, with no central authority deciding in real time?

## Business Rules

- Create, edit, and delete notes with no internet connection at all, on any device.
- Whatever is written on one device eventually appears on all other devices once they reconnect.
- Conflicting edits to the same note are resolved deterministically — never a silent loss, never asks the user to manually merge.
- Deleting a note deletes it everywhere; a deleted note never reappears just because another device syncs in an old edit.
- Sync happens automatically in the background — never manually triggered.
- Reinstalling the app or losing a device never loses notes — they come back in full on login.
- Devices have a user-defined priority rank, used only as a quiet tiebreaker for true simultaneous edits. Reordering priority never rewrites past conflict resolutions — only future ones.
- A new device is added at the bottom of the priority list by default.

## Architecture

- **Local-first storage** — each device keeps a full local copy of all notes in its own on-device database. UI always reads/writes locally first; sync never blocks the user.
- **Append-only operation log** — every change (create, edit, delete) is an immutable, timestamped operation, never an in-place overwrite. This log is what syncs between devices and enables deterministic conflict resolution.
- **Server as durable relay, not arbiter** — Supabase Postgres stores and forwards the full operation history. It never decides conflicts; each device resolves conflicts locally using the same deterministic rule, so they always agree.

```
 Device A (phone)                              Device B (laptop)
┌───────────────────┐                          ┌───────────────────┐
│ note_state         │                         │ note_state         │
│ operations (outbox)│◄──── sync (Supabase) ───►│ operations (outbox)│
│ sync_cursor         │                         │ sync_cursor         │
└───────────────────┘                          └───────────────────┘
```

## Conflict Resolution

Ordering uses a **Hybrid Logical Clock (HLC)** — `(time, counter)` — instead of plain wall-clock timestamps, since device clocks can drift without either being "wrong."

```
candidate_time = max(device's own current wall-clock time,
                      highest HLC time this device has ever seen)
if candidate_time == previous HLC time:
    counter += 1
else:
    counter = 0
    time = candidate_time
```

True ties (identical `(time, counter)`, possible when two offline devices edit the same note before observing each other) are broken by a full priority tuple:

```
priority_tuple = (hlc_time, hlc_counter, device_priority_rank, device_id)
```

`device_priority_rank` is stamped onto each operation **at write time** and stored immutably — never looked up dynamically — so replaying history always produces the same result, and changing priority later never rewrites past resolutions.

## Database Schema

Same shape locally (Dexie/IndexedDB) and on the server (Supabase Postgres):

- **`operations`** — append-only log; source of truth for sync. Never updated, only inserted.
- **`note_state`** — materialized "current truth"; what the UI actually reads.
- **`devices`** — account-level device registry with user-editable `priority_rank`.
- **`sync_cursor`** — local-only bookkeeping of last pulled `server_seq`.

## Sync Algorithm

1. Local edit → compute new HLC → stamp current `priority_rank` → insert into local `operations` → apply immediately to local `note_state` (feels instant, online or not).
2. **Push** (when online): send unsynced local operations to Supabase.
3. **Acknowledge**: mark pushed rows synced — don't delete yet.
4. **Pull**: fetch server operations newer than the local cursor.
5. **Apply**: compare each pulled operation's priority tuple against the stored one in `note_state`; higher tuple overwrites, lower/losing tuple is discarded.
6. Advance `sync_cursor`.
7. Update the device's "highest HLC seen" tracker for every operation processed (local or remote) — this is what self-corrects clock skew.

Device priority list syncs separately via last-writer-wins on `devices.updated_at` — it's account metadata, not part of the note log.

## Local Data Retention

| Table | Rule |
|---|---|
| `note_state` | Never deleted — durable local copy, always readable offline |
| `operations` (local) | Outbox; pruned only after confirmed sync + pull round-trip |
| `sync_cursor` | Tiny, never deleted |
| `operations` (server) | Retained indefinitely in v1 |

**Recovery guarantee:** wiping local storage rebuilds the app fully from zero by pulling and replaying the entire server operation history. The server is the durable backup, not just a relay.

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| App shell | React (Vite), installable PWA | One codebase for laptop browsers and Android Chrome |
| Local storage | Dexie.js (IndexedDB) | Built into every browser; mirrors the schema directly |
| Sync server | Supabase (Postgres) | Auth + `operations`/`devices` tables + `server_seq` assignment |
| Sync & HLC logic | Hand-written TypeScript | The point of this project is understanding the algorithm; adopt a sync library later, once it's understood |

## Known Edge Cases (handled by design)

- Simultaneous offline edits on two devices → broken by stamped `device_priority_rank`.
- Skewed device clock → self-corrects via HLC's `max(local, highest seen)` rule.
- Edit vs. delete race → no special-casing; delete is just another operation type, highest priority tuple wins.
- Stale edit arriving after a delete → discarded on comparison.
- Dropped ack after a successful push → safe; pruning only happens after a confirmed round-trip, duplicate `op_id` is a no-op.
- Duplicate operation applied twice → idempotent by `op_id`.
- New device bootstrap → full replay of server history, defaults to lowest priority.
- Long offline period with many queued ops → push/pull are batched, not per-operation round trips.
- Priority reorder after months of use → only affects future operations, never recomputes `note_state`.
- Out-of-order pull results → never assumed causally ordered; only the priority tuple comparison decides the winner.

## Out of Scope for v1

- Operation log compaction (periodic snapshots).
- Field-level merging (per-field priority instead of whole-note LWW).
- Multi-user support (would require true CRDTs or OT instead of Last-Writer-Wins).
- Adopting a sync library (WatermelonDB, PowerSync, Automerge) once the hand-built version is understood.

## Modules - 
1. Authentication - done
2. Local storage layer — Dexie/IndexedDB setup mirroring note_state, operations, sync_cursor
3. Notes CRUD UI — create/edit/delete, reading and writing local-first
4. Device registry — devices table, priority rank, registering a device on first login
5. HLC clock — the (time, counter) logic for ordering edits
6. Operations log + sync engine — push/pull against Supabase's operations table
7. Conflict resolution — applying the priority-tuple comparison on pull
8. Background/automatic sync triggering — online detection, no manual "sync" button
9. PWA packaging — installable manifest + service worker
10. New-device bootstrap — full replay from server history

## Development

```bash
npm install
npm run dev
```
