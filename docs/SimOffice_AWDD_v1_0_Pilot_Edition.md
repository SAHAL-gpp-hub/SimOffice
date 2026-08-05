# SimOffice — Asset & World Design Document (AWDD)
## Pilot Edition

| | |
|---|---|
| **Document type** | Asset & World Design Document — the physical/visual layer: room layouts, dimensions, prop placement, art direction, character asset spec, audio asset list, and performance/LOD budgets. Turns PRD§9.1/§10's descriptions and GDD v1.0's mechanics into buildable rooms and assets. |
| **Scope boundary** | This document owns **what the world looks like and is made of** — not how things move or respond (Game Design Document's job) and not how UI screens are laid out (UI/UX Design Document's job). Where a prop has both a physical form (this document) and a behavior (GDD), this document places and sizes it; GDD already defined what it does. |
| **Version** | 1.0 |
| **Status** | Ready to brief 3D artists/asset production for Phase 0 (Lobby + Onboarding Course + Backend Engine Room). Phase 1+ rooms are catalogued but not detailed to production-ready depth (§9). |
| **Inputs** | PRD v3.1, SAD v1.3, TSSD v2.1, GDD v1.0, UIUXD v2.1, API Spec v1.1, TDD v1.0, DBD v1.1 (Pilot Editions) |

---

## Table of Contents

1. [Purpose & Inputs](#1-purpose--inputs)
2. [Art Direction & Visual Style](#2-art-direction--visual-style)
3. [Performance Budget & LOD Tiers](#3-performance-budget--lod-tiers)
4. [World Layout — Phase 0](#4-world-layout--phase-0)
5. [Prop Catalog — Phase 0](#5-prop-catalog--phase-0)
6. [Character Asset Spec](#6-character-asset-spec)
7. [Audio Asset List](#7-audio-asset-list)
8. [Asset Production Pipeline & Format](#8-asset-production-pipeline--format)
9. [Phase 1+ Rooms (Parked)](#9-phase-1-rooms-parked)
10. [Validation Performed](#10-validation-performed)
11. [Open Items & Cross-Document Notes](#11-open-items--cross-document-notes)
12. [Traceability Matrix](#12-traceability-matrix)
13. [Sign-off Checklist](#13-sign-off-checklist)
14. [Glossary](#14-glossary)
15. [Changelog](#15-changelog)

---

## 1. Purpose & Inputs

PRD§9.1 and §10 describe the world in prose — "stylized, rounded, toy-like," "server-rack aesthetic, pipe/data-flow motifs," "shows the current incident briefing... live, in place." GDD v1.0 turned the *behavior* half of that into exact mechanics (interaction radii, camera framing, animation states) but explicitly deferred every physical/visual decision to this document (GDD v1.0's scope-boundary line, restated in every relevant section below). This document is where those deferred decisions get made — room dimensions, prop placement, materials, asset budgets — grounded in what GDD already fixed so the two documents describe one consistent world, not two independently-imagined ones.

**Inputs and what each contributes:** PRD v3.1 (room list, tone, look-and-feel requirements) · SAD v1.3 (the workstation-overlay's "one hybrid exception" framing, which constrains how this document solves the notice board's dynamic text — §5.2) · TSSD v2.1 §5.5 (local filesystem + nginx asset delivery, no CDN — constrains total payload budget, §3) · GDD v1.0 (every interaction radius, camera distance, and animation state this document's rooms and props must physically accommodate) · UIUXD v2.1 (confirms which world elements need to coexist on-screen with Shell/HUD layers) · API Spec v1.1 (session roster size and spawn routing constraints) · TDD v1.0 (nearest-desk algorithm resolving interaction overlaps) · DBD v1.1 (display_name source for character name tags).

---

## 2. Art Direction & Visual Style

### 2.1 Overall direction

PRD§9.1's reference point — *closer to Fall Guys or Overcooked than a realistic human avatar* — is the governing constraint for every asset in this document, not just characters:

- **Rounded, simplified geometry** everywhere — soft-edged furniture, chunky prop silhouettes, no fine architectural detail that reads as "realistic office." A server rack should read as a friendly, toy-like object a character could believably bump into (GDD§3.2), not a photoreal equipment cabinet.
- **Saturated, flat-leaning color** rather than muted/realistic material response — bright base colors with simple shading, minimal reliance on complex PBR material stacks (rust, grime, wear) that both cost more to produce and work against the approachable tone.
- **Chunky character proportions** — oversized head-to-body ratio, simplified hands (mitten-like, not fully articulated fingers) — both a stylistic choice matching the toy-like direction and a practical one (fewer rigged bones, cheaper to animate and render, directly supporting §3's performance budget).
- **No literal likeness of real people** (PRD§9.2) — every character asset is a generic customizable persona; nothing in the base rig or default materials should read as a specific real person.

**Building exterior — a deliberate visual identity distinct from the interior (new in v1.1, PRD§10.4):**

The headquarters exterior uses a premium, architectural visual language that is intentionally different from the interior's toy-like, rounded, saturated style. This contrast is a product design decision (PRD§10.4), not an art inconsistency. Artists must treat the exterior and interior as two complementary visual identities, not attempt to match them.

- **Exterior palette:** Cool neutrals — whites, warm-greys, deep architectural blues. Restrained and professional. The palette of a modern technology company headquarters.
- **Exterior geometry:** Clean, angular silhouettes with only subtle edge softening. No chunky, rounded toy-like proportions on the building shell. Rectilinear facades, glass-panel sections, structural legibility.
- **Exterior lighting:** Soft blue-white ambient fill, warm accent from interior light spilling through glass panels, subtle directional shadows at the entrance. Realistic building lighting at overcast day or dusk — not storybook lighting.
- **Transition at the threshold:** As the entry camera crosses the entrance, the visual language shifts. Interior geometry becomes rounder, colors saturate, lighting warms and softens. This transition is the architectural expression of entering the SimOffice simulation. It must be designed as a deliberate crossfade in material and lighting properties — not an abrupt scene switch — so the change reads spatially rather than mechanically.
- **Signage:** "SimOffice" branding above the entrance uses a clean, modern typeface — the same brand identity used in the product's 2D Shell screens, bridging the real-world brand and the 3D world.

### 2.2 Department accent colors

PRD§9.2 requires a *"department-color trim above/on the character"* so teammates can identify each other at a glance, and §10.1 describes each department room's theme in prose without assigning it a color. This document makes that assignment, derived directly from each room's described theme so the character trim and the room it belongs to visually agree:

| Department | Room theme (PRD§10.1) | Accent color | Reasoning |
|---|---|---|---|
| Backend | Server-rack aesthetic, pipe/data-flow motifs | Cyan-teal (`#2DD4BF`-family) | Cool tone matches server-room/data imagery; reads clearly against the room's likely dark-panel server-rack surfaces |
| Frontend | Bright, screen-covered walls, live UI previews | Coral-pink (`#FF6B9D`-family) | "Bright" is explicit in the room's own description; a warm, vivid tone contrasts deliberately with Backend's cool tone |
| DevOps | Dashboards, pipeline monitors, status boards | Amber (`#F5A623`-family) | Status-board/monitoring imagery conventionally reads in amber/warning tones even when nothing is actually wrong — a familiar visual language for "this is where things are watched" |
| QA | Checklists, test rigs, "bug jar" motif | Green (`#4ADE80`-family) | Checkmark/pass-state association; also the conventional "bug" color, doubling as a light, on-theme visual pun |

Four colors, each visually distinct from the other three at a glance (no two are adjacent hues), satisfying PRD§9.2's "identify each other at a glance" requirement even once Phase 1 puts all four departments in the same building. **Phase 0 uses Backend's teal only** — the other three are specified now so Phase 1 doesn't require revisiting this decision, not because Phase 0 needs them.

### 2.3 Lighting

Warm, even, storybook-style lighting rather than dramatic/realistic shadowing — soft ambient fill with a single primary light per room, minimal reliance on dynamic shadow-casting from every prop (both a stylistic choice and a §3 performance decision, since dynamic shadows are one of PRD§16.2's explicitly-named tiered settings). **Note:** this interior lighting direction applies to the Lobby, Backend Engine Room, and all Phase 1+ interior spaces. The building exterior (new §4.0) uses a separate, distinct lighting setup per the exterior art direction in §2.1 above.

---

## 3. Performance Budget & LOD Tiers

PRD§16.2 requires visual quality to *"scale down gracefully rather than being cut entirely"* on Chromebook-class hardware, with *"tiered visual settings (shadows, particle/lighting effects, character density)"* as the named mitigation, and GDD v1.0 §9 committed this document to defining what those tiers actually are. Two tiers, matching GDD§9's 30fps/60fps hypothesis split (both are starting numbers for the still-blocking Device/Performance Baseline Test Plan, PRD§22 item 8, to confirm or revise — not final commitments):

| Budget | Tier 0 (baseline, Chromebook-class) | Tier 1 (above-baseline) |
|---|---|---|
| Visible triangles/frame (whole scene) | ≤ 150,000 | ≤ 400,000 |
| Texture resolution (props/environment) | 512×512 max | 1024×1024 max |
| Texture resolution (characters) | 512×512 max | 512×512 max — characters are small on screen relative to environment; upgrading their texture budget buys little visible improvement, so it's not tied to tier |
| Shadows | Static/baked only, no dynamic shadow-casting | Dynamic shadows from the primary light only, capped shadow-map resolution |
| Particle effects | Disabled (or the cheapest possible static substitute, e.g. a simple emissive glow instead of an animated particle system) | Enabled, capped particle count per effect |
| Character density | Full detail within ~15m of the camera; characters beyond that distance use a simplified low-poly proxy (§6.3) | Full detail within ~30m; proxy swap pushed further out |
| Draw calls (target) | ≤ 150 | ≤ 300 |

**Tier selection is automatic, not a settings menu students configure** — the client detects sustained frame rate during the first several seconds in-world and steps down a tier if it's not holding near the 30fps floor, consistent with M6 (GDD§2) and with PRD§16.2's framing of tiering as a mitigation the product applies, not a burden placed on a student to self-diagnose.

---

## 4. World Layout — Phase 0

Phase 0 needs three physical spaces, per PRD§10.1 and PRD§10.4: the Building Exterior (pre-auth entry scene), the Lobby (which also hosts the one-time onboarding course), and the Backend Engine Room. The exterior and Lobby share a continuous spatial connection — the entry camera fly-through (GDD§4.2) crosses from exterior into Lobby — and the Lobby and Backend Engine Room are directly connected with no elevator routing (Phase 1 behavior).

### 4.0 Building Exterior

**Function (PRD§10.4):** The pre-auth environment. Rendered immediately on page load as Phase 1 of the two-phase engine initialization (TDD§9, SAD§12). This is the lightest asset set in the entire bundle — it loads before Lobby and Backend Room assets begin streaming, and it must be the first thing rendered.

**Scope:** A single, camera-bounded exterior view. The user sees only the front facade and entrance — not a fully modelled building on all sides. What is not visible from the entry camera's start position and travel path does not need to exist.

**Camera framing (GDD§4.2):**
- Start: 15–20m in front of the entrance, at eye level (~1.7m), facing the entrance directly.
- End: 1–2m inside the entrance threshold, aligned with the Lobby spawn point (§4.1).
- The camera travels on a straight Z-axis path. Only the geometry visible along this path needs full production quality.

**Layout:**
- **Entrance doors** — glass double-doors, centered in the facade. Each panel ~1.0m wide × 2.2m tall. Slide apart horizontally (standard automatic office door). Animated: `closed → opening → open` on auth success; `open → closing → closed` on auth failure. Animation: 0.5s ease-in-out each direction. **Mesh reuse requirement:** same geometry as the Lobby threshold (§4.1), so the exterior-facing view and interior-facing view are the same mesh seen from opposite sides. Do not produce two separate door assets.
- **Facade** — the building front extending ~10m to each side of the entrance. Rectilinear facade panels, glass-panel sections, subtle architectural surface relief. Only the portions visible in the entry camera's travel cone need full production quality.
- **Signage** — "SimOffice" lettering above the entrance. Static mesh with emissive material (glows softly). Same typeface as the Shell UI brand identity.
- **Access panel terminal housing** — a slim, wall-recessed panel mount (~0.15m deep, ~0.5m wide × 0.8m tall), beside the right-hand door. Dark anodised material, SimOffice logo embossed in low relief at the top. Provides spatial anchoring for the floating DOM access panel — the DOM form is visually aligned to float over this prop. No interaction trigger radius; interaction is via the DOM form, not a proximity trigger.
- **Interior light spill** — a simple emissive plane behind the glass panels simulating warm interior light. Not a real-time light calculation — a baked or shader-driven approximation. Establishes that the building is occupied and alive before the user enters.
- **Ambient-life elements** — one or two subtle animations (e.g., a slow signage glow pulse, a soft entrance-area light shift) that run continuously before any user interaction, establishing that SimOffice is a living company. These are shader or material property animations — zero polygon or particle cost.

**Performance budget:**

| Budget item | Target |
|---|---|
| Visible triangles | ≤ 20,000 |
| Draw calls | ≤ 100 |
| Texture resolution | 512×512 max (Tier 0); 1024×512 (Tier 1) |
| Asset contribution to initial 15MB bundle | ≤ 2MB |
| Ambient animations | Shader/material-property-driven only; no particle systems |

This budget is a hard constraint, not a guideline. The exterior is rendered first, under the worst-case loading conditions (cold page load, no cached assets). Treat it as: simpler geometry, tighter budget, highest visual impact per polygon in the entire product.

### 4.1 Lobby / Reception + Onboarding Course

**Function (PRD§10.1):** spawn point; hosts the minimal-form Phase 0 onboarding course (PRD§9.4); a **one-time** space — a student passes through it once, on their very first session ever, then spawns directly into the Backend Engine Room on every subsequent join. This spawn logic is not new to this document — it follows directly from the same first-time-vs-returning branch already established by API Spec v1.1 §3.2 and UIUXD v2.1 SCR-06 (an empty `appearance` routes to character creation and, by the same logic, through the onboarding course; a non-empty `appearance` skips both).

**Layout:**
- **Spawn area** — where a joining character first appears; open, uncluttered, generous sightlines so a first-time student isn't disoriented the instant they load in.
- **Character creation staging** — SCR-07's 3D-facing preview (a character-render pedestal or mirror-like framing) lives here, immediately visible from spawn, before the onboarding course begins.
- **Onboarding course path** — implements GDD v1.0 §7's candidate accessibility design directly: a single, unmistakable **walk-only main path** runs from the character-creation area to the Backend Engine Room threshold, wide and flat, no jumps required anywhere along it. Optional jump/traversal obstacles (GDD§3.1's step-up/hop mechanics) sit visibly *alongside* this main path as side detours a confident player can choose, never blocking or narrowing the main path itself. This is a direct physical implementation of GDD§7's proposal — the bypass exists because this layout builds it in, not as a separate fallback route bolted on afterward.
- **Threshold to Backend Engine Room** — a clear visual transition (a doorway, an archway, a change in floor material) rather than an invisible trigger volume, so "you've arrived at your department" reads spatially, matching PRD's "physical journey through the building" framing (§10.2, written about the Phase 1 elevator but the same spatial-honesty principle applies here).

**Scale:** sized for a single student's solo traversal (the onboarding course is a first-session-only, individual experience — PRD§9.4 doesn't describe it as a shared/multiplayer space, and a student's very first session is, by definition, before they've been assigned to a team's shared room). Modest footprint — this is a short on-ramp, not a destination space students return to.

**Spawn area note:** The Lobby spawn point is also the end-point of the entry camera fly-through (§4.0, GDD§4.2) — the entry camera arrives at this position as the fly-through completes, and the player's character spawns here. The spawn area must therefore be immediately readable from the entry camera angle (i.e., from the entrance looking inward), not only from the player's free-roam perspective.

### 4.2 Backend Engine Room

**Function (PRD§10.1):** the one Phase 0 department room — server-rack aesthetic, pipe/data-flow motifs — where every returning student spawns directly, and where the actual session (desks, notice board) happens.

**Layout:**
- **Desk pods, not one fixed desk count.** Since `maxRosterSize` is a teacher-configured field with no fixed PRD number (API Spec v1.1 §5.1), the room is designed around a repeatable **pod of 6 desks** (arranged in two facing rows of 3, a layout that reads as a real shared workspace rather than a lecture-hall grid) that repeats as many times as the session's configured roster size requires, rather than this document committing to one arbitrary total desk count. A session configured for 30 students gets 5 pods; one configured for 12 gets 2. This keeps the room genuinely responsive to a real, variable classroom size instead of over- or under-building for an assumed one.
- **Notice board** — mounted on a wall visible from the majority of the room's desk pods without requiring a student to leave their pod to glance at it (PRD§10.2's "always visible... like a real office monitor wall" passive requirement) — placed at the room's "front," the natural focal wall the desk pods face toward.
- **Server-rack dressing** — background/ambient props (rack units, cable runs, pipe motifs) lining the room's perimeter walls, establishing the theme without being interactive objects themselves (Phase 2 is when server racks become live status props per PRD§10.2 — in Phase 0 they're purely environmental dressing).

**Scale note:** pod spacing (aisle width between pods, and spacing within a pod) is driven by visual room navigability and comfortable player movement. Interaction trigger overlaps are gracefully resolved by TDD v1.0 §5's `handleSitAtDesk` nearest-desk algorithm.

---

## 5. Prop Catalog — Phase 0

Each entry specifies the prop's physical form; GDD v1.0 (cited per entry) already specifies its behavior — this catalog doesn't repeat that, only places and sizes it.

### 5.1 Desk / Workstation

**Behavior already specified:** GDD v1.0 §5.2 (sit/stand, conflict resolution), §4.1 (seated camera transition).

**Physical spec:**
- **Desk footprint:** ~1.2m × 0.7m, chair included in that footprint — proportioned for a single seated character, not a shared table.
- **In-world monitor prop:** a distinct screen-shaped mesh angled toward the seated character's default camera framing (GDD§4.1's fixed seated camera angle) — this is a **static or simple-idle-state mesh** (e.g., a soft glow/boot-up texture, or the department's accent color as an idle screen tint), *not* a dynamic render of actual code. The real code content is the DOM workstation overlay (SAD§12's "one hybrid exception"), which the seated camera transition frames *in front of* this prop — the monitor mesh's job is to be a believable physical anchor the overlay visually aligns with, not to duplicate what the overlay already shows.
- **"Actively working" light:** a small emissive prop (a status-light shape) above or beside the monitor, lit when `seated = true` (SAD§8.2's `PlayerState.seated`) — this is the physical implementation of PRD§10.2's *"small 'actively working' light above the desk."*
- **Interaction trigger volume:** 2.0m radius from the desk's anchor point, per GDD§5.1's default (confirmed appropriate for this object type, not adjusted — see §10's validation).

### 5.2 Notice Board

**Behavior already specified:** GDD v1.0 §5.3 (glance/full-focus states), §8 (chime + highlight-flash on update).

**Physical spec:**
- **Form:** a wall-mounted panel, large enough to read its headline content from across a desk pod (passive-glance legibility) without requiring the full-focus interaction for a student to notice *that* something changed — only to read the full text.
- **Dynamic text rendering — a decision this document makes explicitly, not left ambiguous:** the briefing text changes at runtime (posted at session start, updated via announcements — API Spec v1.1 §5.6) but SAD v1.3 §12 is explicit that the workstation editor is *"the **one** place"* the Shell/3D layers deliberately blur into a DOM overlay. A second DOM overlay for the notice board would contradict that framing. **Decision: the notice board renders its text via Babylon.js's `DynamicTexture`** — text drawn to a canvas and applied as the panel mesh's texture, updated whenever new briefing content arrives — keeping it a genuine 3D-rendered object exactly as PRD§10.2 describes it (*"a real object in the scene, not an overlay"*), with no DOM involved at all.
- **Emissive highlight capability:** the panel's material needs an emissive channel separate from its base text texture, so the update chime's highlight-flash (GDD§8) can brighten the whole panel briefly without needing to redraw or replace the text texture itself.
- **Interaction trigger volume:** 1.5m for the full-focus interaction — tighter than the desk's 2.0m, since full-focus reading is a "step up close and read it properly" action, not a "walk into the general area" one; the passive-glance state has no radius restriction at all (legible from anywhere with line of sight, per its "always visible" requirement).

### 5.3 Entrance Doors

**Behavior already specified:** GDD v1.0 §4.2 (door-open cue, auth-success trigger). SCR-00 (entry states: `Authenticating` → door cracks, `Auth-success` → door opens fully, `Auth-failure` → door closes).

**Physical spec:**
- **Form:** glass double-doors, each panel ~1.0m wide × 2.2m tall. Slide apart horizontally. Framed by the architectural facade (§4.0).
- **Animation state machine:** `closed` → `opening` (0.5s ease-in-out) → `open`; `open` / `cracked` → `closing` (0.5s ease-in-out) → `closed`. `cracked` is a partial-open position (~20% of full travel) used in the `Authenticating` state.
- **Mesh reuse:** same geometry as the Lobby threshold doorway arch, viewed from the exterior side. One mesh, two camera angles — not two separate props.
- **Interaction trigger:** none. Door opens from auth-success signal, not from player proximity. No `E`-key interaction.

### 5.4 Access Panel Terminal Housing

**Behavior already specified:** SCR-00 (floating DOM form composited over this prop's physical position).

**Physical spec:**
- **Form:** slim, wall-recessed panel mount, ~0.15m deep × ~0.5m wide × ~0.8m tall. Mounted beside the right-hand entrance door at ~1.2m height (comfortable reading/touch height for a standing character).
- **Material:** dark anodised metal. SimOffice logo embossed in low relief at the top face.
- **Emissive LED surround:** a thin LED border around the panel perimeter. Material property states: `steady-glow` (Idle) → `pulse-accent` (Authenticating, slow pulse in SimOffice brand blue) → `pulse-red-brief` (Auth-failure, 0.5s red flash) → `steady-glow` (return to Idle). This is a material property animation — zero polygon cost, no particle system.
- **Interaction trigger:** none. This is a spatial anchor for the DOM panel, not a 3D interactive prop.

---

## 6. Character Asset Spec

### 6.1 Base rig

Humanoid, toy-proportioned per §2.1 (oversized head, simplified hands), single base skeleton shared by every character — customization (§6.2) is achieved through material/color swaps and small attachment points, not per-student custom meshes, keeping asset production and runtime cost bounded regardless of roster size.

### 6.2 Customization — Phase 0 scope

Matches PRD§9.2/§9.4 and UIUXD v2.1 SCR-07 exactly — **body color/pattern and a name tag only**; no hats, outfits, or accessories in Phase 0 (those are Phase 1/3, PRD§9.2/§18). The base rig should still have a head-attachment point reserved and unused, so Phase 1's hat/accessory system is an additive asset drop, not a rig rework — a cheap now, expensive-later tradeoff worth taking given how explicitly PRD phases this feature.

- **Body color/pattern:** a swatch set applied to the base material — solid colors plus a small number of simple patterns (stripes, dots), not a full custom-texture-per-student system.
- **Name tag:** an always-facing (billboard) text label above the character's head, showing `display_name` (DBD§6) with the character's department-accent color (§2.2) as a trim/underline — this is the concrete, physical form of PRD§9.2's *"department-color trim above/on the character."*

### 6.3 Required animation clips

Directly enumerated from GDD v1.0 §3.3's `AnimState` vocabulary — every value needs exactly one clip, no more, no fewer, so nothing is missed and nothing is produced without a state that will ever use it:

`idle` · `walk` · `run` · `jump` · `fall` · `land` · `sit` · `standUp` · `emote_wave` · `emote_thumbsUp` · `emote_facepalm` · `emote_thinking`

**12 clips total.** `standUp` and `land` are both short/transitional (GDD§3.3's fixed durations — ~400ms and ~250ms respectively) and can reuse simple, cheap-to-produce animation work (a settle/recovery pose) rather than needing bespoke, expensive keyframing — flagged here so production doesn't over-invest in two clips that are on screen only briefly by design.

### 6.4 Distance LOD proxy (§3's Tier 0/1 character-density budget)

A simplified low-poly proxy mesh — silhouette-accurate but with the rig's simplified-hands/rounded-geometry detail reduced further, and no per-clip animation blending, just a coarse walk/idle toggle — swapped in beyond the distance thresholds in §3's table. Since Phase 0 rooms hold at most a session's roster (realistically dozens, not hundreds, of simultaneous characters), this proxy exists primarily so §3's budget holds even in a fully-populated Backend Engine Room at session start, not because any single view is expected to be crowded beyond what the full-detail budget could handle alone.

---

## 7. Audio Asset List

Every entry pairs with a visual/in-world equivalent already specified in GDD v1.0 §8 — this list is the actual audio asset each of those cues needs, not a repeat of the behavior around it.

| Asset | Used by | Character |
|---|---|---|
| Notice board update chime | GDD§8, SCR-10 | Soft, single rising note, ~0.5s — non-alarming |
| Verification pass confirmation | GDD§8, SCR-21 | Short, upbeat, ~0.8s — clearly distinct in timbre from the notice-board chime so the two are never confused by ear alone |
| Footstep (walk) | Ambient, GDD§3.1 | Light, rhythmic, toy-like (not realistic shoe-on-floor foley) |
| Footstep (run) | Ambient, GDD§3.1 | Faster cadence variant of the same footstep character |
| Landing wobble sound | GDD§3.2/§3.3 `land` state | Soft, brief "boing"-adjacent — matches the squash-and-stretch visual, not a realistic thud |
| Emote sounds ×4 | GDD§5.4, one per emote | Brief, optional, character-vocalization-style (a hum for "thinking," a short exhale for "facepalm," etc.) — explicitly optional flavor per GDD§8, safe to cut first if audio production time is tight |
| Backend Engine Room ambience | §4.2 | Low, looping server-hum/pipe-flow texture — establishes the room's theme (§2) passively, distinct from any discrete cue above |
| Entrance doors open | SCR-00 `Auth-success`, GDD§4.2 | Soft, smooth pneumatic slide — quiet mechanical, ~0.5s. Non-alarming. The sound of a modern automatic office entrance opening. Supplementary to the primary visual event (door visibly moving); satisfies PRD§16.5's "audio never the sole channel" rule. |
| Entrance doors close (auth failure) | SCR-00 `Auth-failure` | Same sound reversed. Brief, ~0.5s. |
| Exterior ambient | SCR-00 `Idle` and `Authenticating` | Very quiet — distant interior HVAC hum, faint exterior presence. Establishes "real building" impression. Looping. **Safe to cut** if audio production budget is tight — listed here so production is aware it exists as an option, not because it is mandatory. |

**All audio needs a visual/in-world equivalent already defined (GDD§8) — this list adds no new cue that doesn't already have one.** No standalone audio-only content exists in this product by construction, which is what actually satisfies PRD§16.5 in practice, not just in policy. Note: UI-layer SFX (shell button clicks, form interactions) are governed by UIUXD and are explicitly excluded from this document's audio budget.

---

## 8. Asset Production Pipeline & Format

- **Format: glTF 2.0 / `.glb`** for every 3D asset (characters, props, environment) — Babylon.js's native, best-supported import format (TSSD v2.1 §4's Babylon.js selection), avoiding any intermediate format conversion step in the pipeline.
- **Delivery: local filesystem + nginx** (TSSD v2.1 §5.5) — no CDN, no edge caching. This doesn't relax the performance budget (§3) — a "good campus network" (TSSD's own phrase) still has finite bandwidth for a room full of Chromebooks loading the same scene at session start, so the total *initial scene payload* (everything needed before the Backend Engine Room is interactive) should stay lean. **Target: under 15MB total for the initial load** (Lobby + Backend Room + base character rig + Tier 0 textures) — a starting number for the same Device/Performance Baseline Test Plan (PRD§22 item 8) that will confirm or revise §3's frame-budget hypotheses, not a separately-validated figure.
- **Texture compression:** standard web-friendly compressed formats (e.g., KTX2/Basis, which Babylon.js supports natively) rather than uncompressed PNGs at scale — keeps the §3 texture-resolution budget from translating into an outsized download cost.
- **Exterior scene budget (new in v1.1):** The building exterior scene (§4.0) is part of the initial scene bundle and loads before Lobby and Backend Room assets. Its 2MB allocation is a hard constraint — exceeding it pushes the initial page load past what campus Chromebooks can deliver in a reasonable time (TSSD§5.5). The 15MB total budget breaks down approximately as: ≤ 2MB exterior scene, ~13MB Lobby + Backend Room + base character rig + Tier 0 textures. The exterior's polygon and draw-call budgets (§4.0) are tighter than any interior room because it is what a user sees during the slowest moment — initial page load, before any browser caching. Treat it as: simpler geometry, tighter budget, highest visual impact per polygon in the product.

---

## 9. Phase 1+ Rooms (Parked)

Catalogued for continuity, matching UIUXD v2.1 §12's parking pattern — not detailed to production-ready depth, since none of this blocks Phase 0.

| Room | Phase | Theme (PRD§10.1) | Accent color (already assigned, §2.2) |
|---|---|---|---|
| Frontend Studio | 1 | Bright, screen-covered walls, live UI previews | Coral-pink |
| DevOps Control Room | 1 | Dashboards, pipeline monitors, status boards | Amber |
| QA Testing Lab | 1 | Checklists, test rigs, bug jar motif | Green |
| Conference Room | 1 | Shared whiteboard, stand-up/sync space | — (neutral, cross-department) |
| Security Operations Center (SOC) | 2 | Cross-department incident status, live server-rack status props | — (neutral, cross-department) |
| Mentor's Office | 2 | Teacher's home base, holo-table dashboard | — (neutral) |
| Elevator / floor routing | 1 | Connects the persistent hub to department floors, once more than one department exists | — |

---

## 10. Validation Performed

Two quantitative claims made above are checked here with actual arithmetic, not just asserted — consistent with this document suite's practice of validating what's checkable (TDD's type-checked algorithms, GDD's type-checked state machine) even where "validation" here means geometry/math rather than compiled code.

**1. Desk spacing vs. interaction-trigger overlap (§4.2, §5.1) — an error caught and corrected here, not just asserted correctly the first time.** GDD§5.1 fixes each desk's interaction radius at 2.0m; two such circles overlap whenever their centers are closer than 4.0m apart (the sum of both radii). An earlier draft of this section set intra-pod spacing at 2.5m and inter-pod aisle spacing at 3.5m, and claimed the *larger* aisle spacing was wide enough to avoid overlap between pods — checked with actual arithmetic (`2*2.0 = 4.0`, and `3.5 < 4.0`), that claim is false: 3.5m still overlaps, exactly as 2.5m does. Rather than simply widening the aisle number to clear 4.0m, the more accurate fix is to drop the premise that overlap needs to be avoided at all: TDD v1.0 §5's `handleSitAtDesk` already resolves "which desk did this interact-press mean" deterministically by nearest-anchor distance, which works correctly regardless of whether trigger radii overlap — a tie only occurs exactly on the midline between two desks (a zero-measure edge case the algorithm already has to handle at any spacing, overlapping or not). **Conclusion: overlap is fine everywhere, intra- and inter-pod alike, given the existing resolution algorithm — spacing doesn't need to be justified by radius math at all.** The actual reason for a wider inter-pod gap (kept at 3.5m) is room navigability — comfortable walking space between pods — not interaction disambiguation, and that's the only claim §4.2 should be read as making about it.

**2. Pod count vs. a realistic roster size.** A 6-desk pod repeated 5 times accommodates a 30-student roster with zero spare desks; repeated 6 times gives a 36-capacity room with headroom for API Spec v1.1's roster-size cap (defined in §5.1, enforced at join time by §3.2) to be set anywhere up to 36 without a room-capacity mismatch. Since `maxRosterSize` has no fixed PRD number, this document doesn't claim one number is "the" room capacity — §4.2 already states the room scales in whole pods to match whatever the session is actually configured for, and this check just confirms the pod unit itself (6 desks) produces a sensible, walkable room at the roster sizes a real classroom is likely to use, not an ambiguous or cramped one.

---

## 11. Open Items & Cross-Document Notes

1. **Exact pod-repeat direction/room aspect ratio** (whether additional pods extend the room lengthwise, add a second row, or wrap an L-shape) is a level-design/blockout decision for whoever builds the actual room, not fixed by this document — §4.2 and §10 fix the *unit* (pod spacing) and the *math* (why it's sound), not the room's overall footprint shape.
2. **Onboarding course exact obstacle count/placement** is deliberately left open here too — §4.1 fixes the *principle* (GDD§7's bypass path, physically realized) as a hard constraint on the layout, not the specific obstacle geometry, which is exactly the kind of detail PRD§9.6's still-open accessibility spike (GDD§7, unchanged status) should weigh in on before it's finalized.
3. **KTX2/Basis texture compression tooling** is named as the target format (§8) but the actual production pipeline/tooling to produce it isn't specified — a build-tooling decision, not a design one, left for implementation.
4. **The 15MB initial-payload target (§8)** is this document's own reasoned starting number, the same way GDD's movement numbers were — flagged as something the Device/Performance Baseline Test Plan (PRD§22 item 8) should confirm or revise with a real measurement, not treated as already validated.

---

## 12. Traceability Matrix

| Section | PRD / prior-doc source |
|---|---|
| §2.1 Art direction | PRD§9.1 |
| §2.2 Department colors | PRD§9.2 (trim requirement), §10.1 (room themes, source of the color reasoning) |
| §3 Performance budget | PRD§16.2, GDD v1.0 §9 (deferred here) |
| §4.1 Lobby/Onboarding | PRD§9.4, §10.1 (Phase 0 one-time-space note), GDD v1.0 §7 (bypass principle, physically realized), API Spec v1.1 §3.2 (spawn logic) |
| §4.2 Backend Engine Room | PRD§10.1, API Spec v1.1 §5.1 (maxRosterSize), TDD v1.0 §5 (sit-at-desk resolution) |
| §5.1 Desk prop | PRD§10.2, GDD v1.0 §5.2/§4.1 (behavior), SAD§12 (hybrid-overlay boundary) |
| §5.2 Notice board prop | PRD§10.2, GDD v1.0 §5.3/§8 (behavior), SAD§12 (the "one hybrid exception" constraint this section resolves against), API Spec v1.1 §5.6 (announcements) |
| §6.2 Character customization | PRD§9.2, §9.4, UIUXD v2.1 SCR-07, DBD v1.1 §6 (display_name) |
| §6.3 Animation clips | GDD v1.0 §3.3 (`AnimState` — enumerated exhaustively) |
| §7 Audio assets | GDD v1.0 §8, PRD§16.5 |
| §8 Pipeline/format | TSSD v2.1 §4 (Babylon.js), §5.5 (local delivery) |
| §4.0 Building exterior | PRD§10.4 (new in v3.2), GDD v1.0 §4.2 (entry camera path), TDD§9 (two-phase engine init), SAD§12 (pre-auth canvas), UIUXD SCR-00 |
| §5.3 Entrance doors | GDD§4.2, SCR-00, PRD§10.4 |
| §5.4 Access panel housing | SCR-00, PRD§10.4 |

---

## 13. Sign-off Checklist

- [ ] §3's performance budget confirmed or revised once the Device/Performance Baseline Test Plan (PRD§22 item 8) produces real numbers — this document's budget is a starting hypothesis, same status as GDD's movement numbers.
- [ ] §5.2's `DynamicTexture` decision reviewed by whoever implements the notice board, to confirm it's the right technical fit before any DOM-overlay alternative is accidentally built instead.
- [ ] §6.3's 12-clip animation list handed to character production as the complete, authoritative list — no clip produced that isn't on it, no `AnimState` value left without one.
- [ ] §4.1's onboarding-course layout reviewed against GDD v1.0 §7's bypass principle specifically (does a genuine walk-only path exist end to end) before the accessibility spike (PRD§9.6, still open) signs off on it.
- [ ] §10's spacing math re-checked against the actual desk/room blockout once built, not just trusted from this document's geometry alone.
- [ ] §4.0 exterior scene asset contribution measured and confirmed ≤ 2MB as part of the initial bundle before any pilot hardware testing — this is the first-rendered scene and the budget is a hard constraint, not a guideline (§8).
- [ ] §5.3 entrance door mesh confirmed as a single shared asset with the Lobby threshold doorway, viewed from exterior and interior sides respectively — verify in the production scene that one mesh is instanced, not two separate assets produced.

---

## 14. Glossary

- **Pod** — a repeatable unit of 6 desks (two facing rows of 3) that the Backend Engine Room's layout scales by repeating, rather than the room having one fixed desk count (§4.2).
- **DynamicTexture** — a Babylon.js feature that renders canvas content (here, briefing text) directly to a mesh's texture at runtime, used for the notice board specifically so it stays a real 3D object rather than a second DOM overlay (§5.2).
- **Tier 0 / Tier 1** — this document's two performance budgets (§3), automatically selected by measured frame rate, implementing PRD§16.2's tiered-visual-settings requirement.

---

## 15. Changelog

**v1.0 — first version.** Establishes art direction (including the department accent-color assignment PRD left unmade), a two-tier performance budget with concrete numbers, Phase 0's two room layouts, a full prop and audio asset catalog cross-referenced exhaustively against GDD v1.0's mechanics, and the asset production format/pipeline. Resolves one real ambiguity rather than leaving it implicit: the notice board's dynamically-changing text is specified as a Babylon.js `DynamicTexture`, not a second DOM overlay, keeping it consistent with SAD v1.3 §12's explicit "one hybrid exception" framing.

**v1.1 — immersive entry sequence (new §4.0, new §5.3–5.4, extended §2.1, §2.3, §7, §8, §12, §13).** Adds the Building Exterior as Phase 0's third physical space (PRD v3.2 §10.4). Key changes: exterior art direction established as a deliberate visual identity distinct from the interior (§2.1); §2.3 lighting note clarified to apply to interiors only; §4.0 exterior layout, camera framing, and performance budget specified; §4.1 spawn area note added (Lobby spawn is also the entry camera's end position); props 5.3 (entrance doors, mesh-reuse requirement against Lobby threshold) and 5.4 (access panel terminal housing) added; entrance door audio and exterior ambient audio added to §7; §8 extended with exterior 2MB bundle budget allocation and total breakdown; §12 traceability matrix extended with three new rows; §13 sign-off checklist extended with two new items.
