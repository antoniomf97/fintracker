# Plan: Mobile UI enhancements

All changes are **mobile-only** (viewport ≤ 640px, the breakpoint already used in
[App.css](frontend/src/App.css)). The desktop layout and behavior stay untouched.

## Foundation: a mobile-detection hook

Three features (reduced range pills, the details toggle, tap-to-edit) need conditional
**rendering**, not just CSS — so add one small hook.

- **New `frontend/src/hooks/useIsMobile.ts`** — wraps
  `window.matchMedia("(max-width: 640px)")`, listens for the `change` event, returns a
  boolean. Reuses the same 640px breakpoint as the CSS.
- In tests the existing `matchMedia` stub returns `matches: false`, so the hook defaults to
  **desktop** — every current test keeps passing unchanged.

## Feature 1 — Center the pie (CSS only)

In the `@media (max-width: 640px)` block, switch the analytics body to a column:

```css
.analytics__body {
  flex-direction: column;
}
```

`.analytics__body` already has `align-items: center`, so in column direction the donut
centers horizontally. One line.

## Feature 2 — Fewer range pills on mobile ([Analytics.tsx](frontend/src/components/Analytics.tsx))

Reduce the 6 pills to **All time · This month · Custom**:

```ts
const isMobile = useIsMobile();
const MOBILE_RANGES = ["all", "month", "custom"];
const ranges = isMobile
  ? RANGES.filter((r) => MOBILE_RANGES.includes(r.key))
  : RANGES;
```

Render `ranges` instead of `RANGES`. Default is already `"month"` (in the set).

Edge case: if "3m/6m/year" was active before a resize to mobile, its pill won't show but
the filter still applies — harmless, not worth resetting.

## Feature 3 — Hide per-category breakdowns behind a toggle ([Analytics.tsx](frontend/src/components/Analytics.tsx))

Add `const [showDetails, setShowDetails] = useState(false)`. On mobile, render a
**"More details" / "Hide details"** button at the top of `.analytics__breakdowns`, and gate
the three `.breakdown` blocks behind `(!isMobile || showDetails)`.

**Decision:** the _Income vs. spending_ flow bar stays visible (it's the headline
comparison, not a per-category bar — which is what should be hidden). Mobile order:
toggle → [3 breakdowns when expanded] → flow bar.

New CSS: `.breakdowns__toggle` (full-width, ghost-button style, only shown on mobile).

## Feature 4 — Transaction filters → Type + Period ([TransactionFilters.tsx](frontend/src/components/TransactionFilters.tsx))

- Wrap the two date inputs in a `.filters__period` group with a "Period" label (label
  hidden on desktop, shown on mobile).
- Hide the **Category** text input on mobile via CSS (`display: none`) — keeps it in the DOM
  so the existing filter tests pass untouched.
- Keep the Type select and Clear button.

The "date range" is the existing native from/to date inputs (a real range).

## Feature 5 — Tap a transaction to edit; drop the cogwheel ([App.tsx](frontend/src/App.tsx) + CSS)

`setEditing(t)` is already the exact action the cogwheel triggers — so on mobile attach it
to the row:

```tsx
<tr
  onClick={isMobile ? () => setEditing(t) : undefined}
  role={isMobile ? "button" : undefined}
  tabIndex={isMobile ? 0 : undefined}
  onKeyDown={isMobile ? enterOrSpace(() => setEditing(t)) : undefined}
  aria-label={isMobile ? `Edit transaction from ${t.date}` : undefined}
  className={isMobile ? "transactions__row--tappable" : undefined}
>
```

CSS hides the cogwheel cell on mobile (`td.col-actions { display: none }`) and removes the
now-pointless `padding-right: 2.25rem` reservation. Desktop keeps the cogwheel exactly
as-is. No change to EditTransactionDialog.

## Feature 6 — Tighter transaction rows (CSS only)

In the media query, reduce the per-cell vertical padding
(`.transactions td { padding: 0.15rem 0 }`, down from `0.3rem`) and drop the right padding
now that the cogwheel is gone.

## Tests

- **New** `useIsMobile.test.ts` — initial value from `matchMedia`.
- **Analytics.test.tsx** — add a mobile case (force `matchMedia` to match) asserting only 3
  pills render and breakdowns are hidden until "More details" is clicked. Existing desktop
  tests unchanged.
- TransactionFilters/App tests need no changes (they run at the desktop default).
- Run `npm run lint`, `npm test`, `npm run build`.

## Files touched

- **New:** `hooks/useIsMobile.ts`, `hooks/useIsMobile.test.ts`
- **Edit:** `Analytics.tsx`, `TransactionFilters.tsx`, `App.tsx`, `App.css`,
  `Analytics.test.tsx`

## Open questions

1. Keep the Income-vs-spending flow bar visible on mobile (this plan) or hide it with the
   per-category breakdowns?
2. Anything else before implementing?
