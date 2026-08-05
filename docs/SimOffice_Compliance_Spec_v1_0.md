# SimOffice Compliance & Content Specification
**Version:** 1.0 (Pilot Edition)
**Status:** NEW CONTENT — NEEDS SIGN-OFF

This document resolves B2 Decision Ticket G1, capturing the compliance, privacy, and content guidelines necessary for the SimOffice Phase 0/1 Pilot.

## 1. Privacy Policy
The official Privacy Policy for the SimOffice platform must be presented to users at login.
- **Privacy Policy URL:** `[PENDING LEGAL REVIEW - TBD]`
- **Consent Mechanism:** The pilot assumes institutional-level consent handled out-of-band by the participating school. A direct consent flow is not currently implemented in the product UI.

## 2. AI Prompt Library & Guardrails
The underlying models driving the scenario content and any NPC behaviors must be constrained by the following guardrails:
- **No PII:** The prompt library explicitly forbids the extraction or generation of Personally Identifiable Information.
- **On-Topic Constraint:** Prompts must enforce that responses stay strictly within the domain of the software engineering scenario.
- **Reference:** See the external `AI_AGENT_PROMPT_LIBRARY.md` for the specific system prompts used for scenario generation.

## 3. Content Liability & Authoring Rules
Authors writing scenarios for the SimOffice platform must adhere to:
- No real-world company names, real individuals, or copyrighted code snippets may be used in scenarios.
- All code planted in a scenario must be synthetic and explicitly written for educational purposes.

*(This is a living document and will be expanded before any multi-institution deployment.)*
