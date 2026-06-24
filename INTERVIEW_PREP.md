# Authentication Module — Interview Q&A

Answers to the question bank covering the auth module: Supabase Auth, the
`profiles` table + trigger + RLS, the Context/hook split, and the password
recovery flow.

---

## 1. Business & Product Logic

**Q1. This app is explicitly single-user-multi-device, not multi-tenant — why does it need authentication at all?**

Even with one human, the app runs on a shared backend (Supabase) reachable
by anyone holding the publishable key. Auth provides a stable identity
(UUID) to scope rows via RLS, a way to authorize requests from any of the
user's devices without trusting the client alone, and protection against
the publishable key being public — without auth + RLS, anyone with that
key could read or write all data in the project.

**Q2. What's the actual purpose of a `profiles` table for one real user — is that overengineering?**

No — it's the standard extension point for app-specific fields (display
name, future preferences) that Supabase's locked-down `auth.users` table
doesn't expose for direct modification. Even with one user, somewhere has
to hold non-auth attributes, and the pattern costs nothing extra if
multi-user ever becomes relevant.

**Q3. Walk through signup end-to-end — where does the source of truth live?**

Client calls `signUp()` → Supabase Auth (GoTrue) inserts a row into
`auth.users` (hashed password, email, metadata) — this is the source of
truth for identity/credentials, fully managed by Supabase → that insert
fires the `on_auth_user_created` trigger → which inserts the matching row
into `public.profiles` (app-specific data) → the response carries a
session, or `null` if email confirmation is still required.

**Q4. What's the trade-off of disabling "Confirm email"?**

Gained: no shared rate-limit blocker, instant login after signup. Lost:
anyone can sign up with an email they don't control — low risk for a
private single-user app, but it also removes the one proof that a
password-reset email will actually reach someone.

**Q5. What would have to change for a second real user?**

The `profiles` RLS already scopes correctly by `auth.uid() = id`. But the
README's whole sync model is explicitly single-owner Last-Writer-Wins —
`operations`/`devices` would need a `user_id` column and matching RLS, and
the priority-rank tiebreak logic assumes one account's devices, not
cross-account conflicts. True multi-user collaborative editing needs
CRDTs/OT, which the README already lists as out of scope.

---

## 2. Authentication & Session Management

**Q6. What is a JWT, and where does Supabase use one here?**

A signed, base64-encoded token carrying claims (user id, role, expiry)
that can be verified without a database lookup. Supabase issues one as
the access token after login; `supabase-js` attaches it as a Bearer
header on every request; Postgres reads it via `auth.uid()` to evaluate
RLS policies.

**Q7. Access token vs. refresh token — why both?**

Access token: short-lived (~1 hour default), sent with every request,
proves identity right now. Refresh token: long-lived, never sent to your
API, used only to silently mint a new access token. This lets a session
last for weeks without a long-lived, high-privilege token in active
circulation.

**Q8. How does the app know you're still logged in after a refresh?**

`supabase-js` persists the session in `localStorage`. On boot,
`AuthProvider`'s `useEffect` calls `supabase.auth.getSession()`, which
reads and validates the stored session — no re-login required unless the
refresh token itself has expired or been revoked.

**Q9. `onAuthStateChange` vs. `getSession()` — why need both?**

`getSession()` is a one-shot read. `onAuthStateChange` is a subscription
that fires on every future auth event (sign-in, sign-out, token refresh,
password recovery) for the page's lifetime — the only way the React
`session` state stays in sync with changes that happen asynchronously in
the background.

**Q10. What does the `PASSWORD_RECOVERY` event represent, and why isn't checking `session` enough?**

Clicking a recovery link does produce a valid session (required to call
`updateUser()`), but a truthy session there doesn't mean "show the normal
app" — it means "this person proved inbox ownership and must set a new
password first." Only the dedicated event distinguishes a recovery
session from a normal login.

**Q11. What's actually in the reset-link URL, and how does the client read it?**

With Supabase's default implicit flow, the redirect URL carries a
fragment (`#access_token=...&refresh_token=...&type=recovery`) appended
after the one-time email token is verified server-side. `supabase-js`'s
`detectSessionInUrl` parses that fragment on page load, stores the
session, strips it from the visible URL, and fires `PASSWORD_RECOVERY`.

**Q12. What breaks if `detectSessionInUrl` is off?**

The app would load normally but never notice the tokens in the URL
fragment — no session, no `PASSWORD_RECOVERY` event. The user lands on
the plain login screen despite clicking a valid link, and the recovery
flow silently fails.

**Q13. Why doesn't signup log the user in immediately by default?**

Because Supabase's default posture requires proving control of the email
before trusting the account — otherwise anyone could create and use an
account tied to an email address they don't own. (We deliberately turned
this off for the current dev/single-user phase.)

---

## 3. Database Design & SQL

**Q14. Why is `profiles` separate from `auth.users`?**

`auth.users` is internally owned by Supabase Auth — unsafe to alter, and
not meant for broad client reads (it holds password hashes, provider
tokens, etc.). `public.profiles`, under your own control with your own
RLS, is the documented, supported extension point.

**Q15. Why does `profiles.id` reuse `auth.users.id` instead of its own primary key?**

It enforces a strict 1:1 relationship by construction, and means
`auth.uid()` can be compared directly to `profiles.id` with no separate
join/lookup table needed to map one identity to the other.

**Q16. What does `on delete cascade` protect against?**

Without it, deleting a user would either fail on the foreign-key
constraint or leave an orphaned `profiles` row pointing at a user that no
longer exists. Cascade keeps both tables consistent automatically.

**Q17. Why a trigger instead of inserting the profile client-side after `signUp()`?**

A client-side call can be skipped — a network failure between the two
calls, a bug, or simply a client that never makes the second call leaves
the account in an inconsistent state forever. The trigger runs inside the
same transaction as the `auth.users` insert: it's guaranteed to run, and
if it fails, the whole signup fails atomically.

**Q18. Why does the trigger need `security definer`, and what's the risk?**

The function inserts into `public.profiles` as a side effect of an insert
into `auth.users` performed by Supabase's internal service role, which
wouldn't normally have insert rights there. `security definer` runs the
function with its owner's elevated privileges instead. The risk: it now
runs with that elevated privilege no matter who triggers it, so it must
do exactly one narrow, well-scoped thing.

**Q19. What does `set search_path = public` defend against?**

Postgres resolves unqualified names (like `profiles`) by searching
`search_path` in order. A `security definer` function normally inherits
the *caller's* `search_path`, which an attacker could manipulate (e.g.
planting a same-named object in a schema that resolves first) to hijack
what the function touches while it runs with elevated rights. Pinning the
path removes that attack surface.

**Q20. Where does `raw_user_meta_data` come from?**

It's a JSONB column on `auth.users`, populated via the `options.data`
field passed into `signUp()`. A trigger only sees the inserted row, not
the original API call's arguments, so this JSON blob is the only channel
for client-supplied extra data (like the display name) to reach it.

**Q21. If the `profiles` insert fails inside the trigger, does the user account still get created?**

No — once the trigger exists, an error inside it rolls back the entire
transaction, including the `auth.users` insert, so the signup call fails
outright and no account exists. (This is different from what happened
before the migration was ever run: with no trigger at all, the
`auth.users` insert succeeded fine on its own, just with no profile row
created.)

---

## 4. Security / RLS

**Q22. RLS vs. permission checks in application code?**

RLS enforces rules inside Postgres itself, evaluated on every query no
matter which client, API layer, or tool issues it. App-level checks only
protect requests that pass through that specific code — any path that
bypasses it (a bug, a new endpoint, a direct DB connection) loses the
protection. RLS can't be skipped per-request because it isn't a
per-request decision.

**Q23. RLS enabled with no policies — allow or deny, and why does the direction matter?**

Deny, for everyone, by default. The failure mode of forgetting a policy
becomes "nobody can see anything" — loud, breaks the feature, gets
noticed immediately — rather than "everyone can see everything," which
is silent and often only discovered by an attacker or an audit.

**Q24. What does `auth.uid()` return, and how does Postgres know who's asking?**

It reads the `sub` claim out of the JWT attached to the current request
(set via `request.jwt.claims` by PostgREST before the query runs) and
returns it as a UUID — letting a SQL policy compare row ownership to the
actual caller with zero application code in between.

**Q25. Publishable key vs. secret key — what happens if the secret key leaks to the client?**

Publishable key (`sb_publishable_...`): safe to embed client-side; grants
no special access on its own, every request is still subject to RLS.
Secret key (`sb_secret_...`, formerly "service_role"): bypasses RLS
entirely, for trusted server-side code only. If it ends up in a client
bundle, anyone opening devtools can extract it and read/write every row
in every table — RLS is completely defeated.

**Q26. How would you actually prove User A can't read User B's data?**

Hit the REST API directly with no auth (or just the publishable key) and
confirm it returns `[]`, not real rows. Then sign in as two separate
accounts, grab each one's access token from `localStorage`, and confirm
requesting the same endpoint with User A's token never returns User B's
row even though it exists in the table.

**Q27. Why is deny-by-default considered safer?**

The cost of a missing rule is "too restrictive" — annoying, visible,
fail-closed — instead of "too permissive" — invisible, fail-open, a real
incident. Fail-closed defaults get caught by ordinary functional testing
rather than only by a dedicated security audit.

**Q28. What's exposed if RLS is forgotten on a brand-new table?**

New Postgres tables have RLS disabled by default, meaning any role with
table-level grants — typically `anon` and `authenticated` for Supabase —
can read/write it freely. Forgetting RLS means anyone holding just the
publishable key (i.e. anyone who loaded the web app) can read and write
that entire table with zero further authorization.

**Q29. What was actually rate-limited, and why so aggressively?**

Supabase's default email sender is shared infrastructure meant only to
let a brand-new project test auth flows without configuring SMTP — it
caps outgoing auth emails (confirmation, recovery) at a small number per
hour per project specifically so it can't be abused as a free mass-mailer.

---

## 5. React / Frontend Architecture

**Q30. Why split the context into three files?**

So each file exports exactly one *kind* of thing — a plain
object/type, a component, or a hook — which is what React Fast Refresh's
"only export components" rule needs to safely hot-swap a file on save
without losing state elsewhere in the tree.

**Q31. Mechanically, why does mixing a component and a hook export break Fast Refresh?**

The Fast Refresh transform statically inspects a module's exports at
build time. If everything is a component, it can swap just that
implementation in place. The moment a non-component export (a hook, a
constant) is also present, it can't guarantee what an edit means for the
running tree, so it falls back to a full reload for any change to that
file.

**Q32. Why Context instead of prop drilling or Redux/Zustand?**

Prop drilling would force every intermediate component to forward
session/auth functions regardless of whether it uses them. Redux/Zustand
add a dependency and boilerplate for what's fundamentally a thin wrapper
around Supabase's session object and three async functions — Context is
sized correctly for "global, infrequently-changing, broadly needed"
state without pulling in features (middleware, time-travel debugging)
that aren't needed here.

**Q33. Why explicitly throw in `useAuth` if called outside `AuthProvider`?**

Without it, the Context's default value (`null`) is returned silently,
and the bug only surfaces later as a confusing crash on something like
`context.session` far from its real cause. Throwing immediately, with a
clear message, turns a silent footgun into a loud, fast, diagnosable
error right at the point of misuse.

**Q34. Why does `App.tsx` check `loading` before `session`?**

`getSession()` is asynchronous — for a brief moment after mount, React
doesn't yet know if a session exists. Checking `!session` first would
flash the login screen for already-logged-in users on every page load,
before flipping to real content once the check resolves. Checking
`loading` first avoids that flicker.

**Q35. Why is `passwordRecovery` checked before `!session`?**

Because the recovery flow legitimately produces a truthy session.
Checking `!session` first would treat someone who just clicked a reset
link as fully logged in and send them straight into the main app,
skipping the mandatory "set a new password" step.

**Q36. Why a singleton Supabase client instead of constructing it per component?**

Each `createClient()` call sets up its own auth state and storage
listeners. Instantiating it inside a component would create a new,
disconnected client on every render, each with its own quickly-diverging
view of the session. One module-level instance, imported everywhere,
guarantees a single consistent source of truth.

---

## 6. "Why not the alternative?" — trade-offs

**Q37. Why Supabase Auth instead of rolling your own?**

Rolling your own means owning password hashing, token issuance/rotation,
secure session storage, brute-force protection, email verification, and
reset-token expiry — all security-critical, easy-to-get-subtly-wrong
surface area. Supabase Auth is a maintained implementation of all of it,
free at this scale, leaving focus for the actual product.

**Q38. Why Supabase over Firebase Auth or Auth0?**

Firebase Auth ties you to its broader NoSQL-centric ecosystem; Auth0 is
auth-only and still needs a separate database/API wired up alongside it.
Supabase bundles Auth with a real Postgres database and RLS in one
project, matching this app's architecture (Postgres as the sync relay)
without gluing two vendors together.

**Q39. Why RLS instead of middleware/API-layer checks?**

Middleware only protects requests through that specific code path. RLS
protects the data itself at the one layer every possible access path —
today's app, a future admin tool, a direct SQL connection — is guaranteed
to pass through. It's strictly harder to accidentally bypass.

**Q40. Why a trigger instead of a client-side insert after `signUp()`?**

Same reasoning as Q17 — atomicity. A trigger can't be skipped by a
network blip, an unrelated exception, or a client that simply never makes
the second call.

**Q41. Why no router yet?**

Right now there are exactly two top-level states (authenticated vs. not,
plus the recovery sub-state). A router's value — URL-addressable views,
back/forward, deep-linking — isn't needed for a screen that's either
"auth forms" or "one app view." Worth adding once there's more than one
real authenticated route (e.g. individual notes getting their own views).

**Q42. Why `.env` instead of hardcoding, given the publishable key is safe to expose anyway?**

Hardcoding still couples the code to one specific Supabase project —
switching between dev and a future production project, or letting a
teammate use their own project, would mean editing source instead of
swapping a config file. It's also the pattern any future contributor
expects instantly.

**Q43. Why disable email confirmation instead of setting up real SMTP?**

For where the project is right now — single user, local dev, rapid
iteration — configuring a transactional email provider (DNS records,
provider account, sender verification) is real setup work to solve a
problem a five-second dashboard toggle already solves. Real SMTP is the
right move before any production reliance on recovery email, not before.

**Q44. Why numbered migration files instead of one editable `schema.sql`?**

An editable schema file only shows current state, not the order changes
must be replayed on a fresh database. Once there's more than one change,
you lose the ability to apply them incrementally to a database that's
only partway caught up (a teammate's project, a later staging
environment). Numbered files double as an audit trail and a replay
sequence.

**Q45. Why `security definer` instead of granting `authenticated` direct insert rights on `profiles`?**

A broad grant would let any logged-in user insert an arbitrary profiles
row for any id, at any time. The trigger means the *only* way a profiles
row is ever created is as an automatic, system-controlled side effect of
an actual signup — a much tighter guarantee than client-side discipline
plus an open grant.

---

## 7. General concepts

**Q46. Authentication vs. authorization — example from this project?**

Authentication: proving who you are (Supabase verifying email/password
against `auth.users`). Authorization: what you're allowed to do once
identified (the RLS policy `auth.uid() = id` deciding you may only read
or update your own profile row, not anyone else's).

**Q47. Session/cookie auth vs. token/JWT auth — which is this?**

Cookie/session auth keeps a server-side session store, identifying the
user via an opaque cookie looked up per request. Token/JWT auth encodes
identity/claims directly into a signed token the client holds and
presents — no server-side lookup, just signature verification. This
project uses the token model: a signed access token in `localStorage`,
sent as a Bearer header.

**Q48. What's CSRF, and why does this design dodge it but take on a different risk?**

CSRF exploits the browser auto-attaching cookies to requests made from a
malicious page you're merely visiting. Since tokens here are read
explicitly from `localStorage` and attached manually as a header (never
auto-sent by the browser), a malicious site can't trigger an authenticated
request just by you visiting it. Trade-off: anything that can run
JavaScript in the page's origin (an XSS bug) can read `localStorage`
directly and steal the token outright — CSRF risk drops, XSS consequence
rises.

**Q49. Hashing vs. encryption — which applies to password storage?**

Encryption is reversible with the right key. Hashing is one-way — Supabase
stores a salted hash, not the password itself, so there's no operation
that recovers the original password from storage, even by Supabase.
Verifying a login means hashing the submitted password the same way and
comparing hashes, never decrypting anything.

**Q50. What's the trade-off of using a BaaS like Supabase?**

You get a production-grade auth system, database, and API layer running
and largely secured on day one, without building or operating any of it
yourself. The cost: dependency on that vendor's uptime, pricing, and
feature set — highly custom backend logic either has to fit their
extension points (Postgres functions/triggers, Edge Functions) or you
eventually outgrow the model and need your own server.