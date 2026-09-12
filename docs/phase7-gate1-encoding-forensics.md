# Phase 7 — Gate 1: Encoding Forensics & User-Facing Text Inventory

## Status

**GATE 1 COMPLETE — FORENSICS RECORDED; NO USER-FACING ENCODING REPAIR PERFORMED**

Phase 7 starts with a forensic-only gate. The purpose is to identify encoding corruption and separate it from ordinary translation/wording defects before any text is changed.

## Baseline

- Base branch: `main`
- Phase 6 merge baseline: `bf7960d3da893a8339e76a7d631edb4514e4f171`
- Repository: `Abdeldjalildev/MenuFlow`
- Engineering contract: `AGENTS.md`

## Scope actually inspected

The repository structure and text-bearing areas were inspected from the current `main` baseline, with focused inspection of:

- `README.md`
- `AGENTS.md`
- `src/pages/TableEntry.tsx`
- `src/utils/translations/AdminTranslations.tsx`
- `src/utils/translations/customerTranslations.tsx`
- `src/utils/translations/cashierTranslations.tsx`
- `src/utils/translations/deliveryTranslations.tsx`
- `src/utils/translations/kitchenTranslations.tsx`
- `src/utils/translations/merchantTranslations.tsx`
- `src/utils/translations/myReceiptsTranslations.ts`
- `src/` structure, including components, pages, routes, services, context, types, and utilities.
- Repository-wide GitHub code-search probes for common UTF-8/mojibake signatures: `Ã`, `Â`, `â`, `ð`, `Ù`, `Ø`, `�`, and common smart-quote/dash corruption patterns.

## Findings

### F1 — Confirmed: the repository contract records a historical user-facing encoding finding

`AGENTS.md` explicitly lists user-facing encoding corruption as a confirmed/high-confidence audit finding and requires a deliberate migration rather than blind global replacement.

**Classification:** Confirmed issue in the project's audit backlog.

**Current Gate 1 conclusion:** The finding is valid as a backlog item, but the current GitHub indexed-code probes did not return a concrete mojibake match that is safe to repair automatically.

### F2 — Confirmed: current translation files contain real multilingual text, not blanket ASCII-only content

The inspected translation modules contain valid Arabic, French, and English strings. This means the encoding audit must preserve UTF-8 multilingual content and cannot use a simplistic "non-ASCII = corruption" rule.

**Classification:** Safety constraint.

### F3 — Confirmed: there are wording/translation inconsistencies that are NOT encoding corruption

Examples found during inspection include mixed-language or wording defects such as the Arabic translation value `Actيف (Active)` in `AdminTranslations.tsx`, and mixed-language values in `customerTranslations.tsx` such as `Add to Order` inside the French section and `Ajouter للشركاء/الطلب` inside the English section.

These are translation-quality findings and must **not** be silently treated as encoding corruption in Gate 2.

**Classification:** Confirmed quality findings; deferred to the appropriate quality/naming/documentation work, not an encoding repair.

### F4 — Confirmed: README is stale, but this is documentation debt, not encoding corruption

`README.md` still describes the generic React + TypeScript + Vite starter template instead of the actual MenuFlow product. This belongs to Phase 7 Gate 4 and must not be mixed into Gate 1 encoding repair.

**Classification:** Confirmed documentation issue; deferred to Gate 4.

## Encoding decision matrix

| Finding | Encoding corruption? | Action in Gate 1 | Future action |
|---|---|---|---|
| Historical user-facing corruption recorded in `AGENTS.md` | Confirmed backlog | Inventory only | Locate exact strings/files before Gate 2 |
| Arabic/French/English Unicode text | No evidence of corruption | Preserve | None unless a concrete defect is found |
| `Actيف (Active)` | No; wording/mixed-script defect | Do not modify | Translation-quality review |
| Mixed-language translation values | No; translation consistency issue | Do not modify | Translation-quality review |
| Stale Vite README | No | Do not modify | Gate 4 |

## Search evidence

Repository-wide GitHub search probes for common mojibake/replacement-character signatures returned no indexed matches for the tested signatures. This is useful evidence, but it is **not equivalent to a complete byte-level UTF-8 proof** of every repository blob.

Therefore this gate deliberately does **not** claim that all historical corruption has been eliminated. It records the boundary between what is confirmed and what still requires exact localization.

## Golden-rule compliance

- No application logic changed.
- No Firestore rules/schema changed.
- No authentication or authorization changed.
- No AI behavior changed.
- No dependencies changed.
- No global string replacement performed.
- No translation wording was silently rewritten.
- No files were renamed.
- No CI checks were weakened or changed.
- No production configuration was changed.
- No destructive Git operation was used.

## Gate 1 exit criterion

Gate 1 is considered complete because the forensic boundary, inspected text areas, search evidence, confirmed findings, and deferred findings are documented. **Gate 2 must not begin by guessing which strings are corrupted.** It may only repair concrete, reviewed encoding defects that have been localized and evidenced.

## Next approved step

**Phase 7 — Gate 2: Safe Encoding Repair**

Gate 2 should begin only after exact corrupted strings/files are identified with sufficient confidence. Translation-quality inconsistencies listed above should remain separate from encoding repair unless explicitly included in a later approved scope.
