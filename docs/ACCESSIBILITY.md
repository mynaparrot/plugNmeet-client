# Accessibility Developer Guide

This document describes the accessibility conventions, utilities, and enforcement rules for the plugNmeet web client (`a-client`).

## Quick Reference

| Concern                     | Solution                                                    |
| --------------------------- | ----------------------------------------------------------- |
| Screen-reader-only text     | `sr-only` utility                                           |
| Visible focus indicator     | `focus-ring` utility                                        |
| Icon-only buttons           | `aria-label={t('i18n.key').toString()}`                     |
| Tooltips on keyboard focus  | `<Tooltip>` component or `.has-tooltip:has(:focus-visible)` |
| Custom interactive elements | `role`, `tabIndex={0}`, `onKeyDown` (Enter/Space)           |
| Semantic landmarks          | `<header>`, `<main>`, `<footer>`                            |
| Lint enforcement            | oxlint `jsx_a11y` plugin (warn level)                       |

---

## CSS Utilities

### `sr-only`

Makes content visible only to screen readers. Defined in `src/styles/index.css`.

```tsx
<span className="sr-only">This text is for screen readers only</span>
```

### `focus-ring`

Provides a visible focus indicator for keyboard users. Adds a 2px blue ring with offset on `:focus-visible`.
Defined in `src/styles/index.css`.

```tsx
<button className="focus-ring ...">Click me</button>
```

Use `focus-ring` on:

- All `<button>` elements
- All `<input>` / `<select>` / `<textarea>` elements
- Custom interactive elements with `tabIndex={0}`

Elements that already use `focus:shadow-input-focus` (inputs, dropdowns) may also include `focus-ring` for additional visibility.

**Design**: Uses `ring-Blue` token (`--color-Blue: #00a1f2`) from `variables.css`. This is a semi-transparent box-shadow that overlays safely on any background, including custom-branded colors from `useClientCustomization`.

---

## Icon-Only Buttons

Every button that contains only an SVG icon (no visible text) MUST have an `aria-label`.

```tsx
// ✅ Correct
<button
  type="button"
  onClick={handleClick}
  aria-label={t('footer.icons.show-chat-panel').toString()}
>
  <ChatIconSVG />
</button>

// ❌ Wrong — screen readers announce nothing
<button type="button" onClick={handleClick}>
  <ChatIconSVG />
</button>
```

Use the existing i18n key from the tooltip text. The `aria-label` should match what the tooltip would show.

For Headless UI `MenuButton`:

```tsx
<MenuButton
  className="... focus-ring"
  aria-label={t('header.menus.menu').toString()}
>
  <HeaderMenuIcon />
</MenuButton>
```

---

## Tooltips

### Pattern A — CSS tooltip (legacy, used by footer icons)

```tsx
<div className="has-tooltip">
  <button aria-label={t('footer.icons.some-action').toString()}>
    <span className="tooltip">{t('footer.icons.some-action')}</span>
    <SomeIcon />
  </button>
</div>
```

The `.has-tooltip:has(:focus-visible)` selector ensures tooltips appear on keyboard focus, not just hover.

### Pattern B — React Tooltip component

```tsx
import Tooltip from '../../helpers/ui/tooltip';

<Tooltip text={t('tooltips.some-key')}>
  <span className="cursor-help">Label</span>
</Tooltip>;
```

The `<Tooltip>` component automatically:

- Generates a unique `id` via `useId()`
- Wraps children in a focusable `<span>` with `tabIndex={0}`
- Links the tooltip via `aria-describedby`
- Shows on both hover (`group-hover`) and keyboard focus (`group-focus-visible`)

---

## Semantic HTML Landmarks

The app shell uses semantic landmarks:

```tsx
<header id="main-header">   {/* src/components/header/index.tsx */}
<main className="plugNmeet-app">   {/* src/components/app/index.tsx */}
<footer id="main-footer">   {/* src/components/footer/index.tsx */}
```

When adding new page sections, use appropriate semantic elements:

- `<nav>` for navigation
- `<section>` for distinct sections (with `aria-label` or `aria-labelledby`)
- `<h1>`–`<h6>` for headings (use sequentially)

---

## Custom Interactive Elements

Non-semantic elements (e.g., `<div>`) that respond to clicks MUST provide keyboard access:

```tsx
// ✅ Correct
<div
  role="button"
  tabIndex={0}
  className="... focus-ring"
  onClick={handleAction}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleAction();
    }
  }}
>
  Interactive content
</div>

// ❌ Wrong — keyboard users cannot activate this
<div onClick={handleAction}>
  Interactive content
</div>
```

Prefer native `<button>` elements whenever possible.

---

## ARIA on Shared UI Components

### RangeSlider (`src/helpers/ui/rangeSlider.tsx`)

Pass a `label` prop for screen reader context:

```tsx
<RangeSlider label="Volume" min={0} max={100} value={50} onChange={...} />
```

The slider automatically sets `role="slider"`, `aria-valuemin/max/now`, `tabIndex={0}`, and handles Arrow/Home/End keys.

### Modal (`src/helpers/ui/modal.tsx`)

The close button has `aria-label="Close"`. The `DialogTitle` provides the accessible name.

### Tooltip (`src/helpers/ui/tooltip.tsx`)

Uses `role="tooltip"` and `aria-describedby`. Children are wrapped in a focusable element.

---

## Form Accessibility

- Every `<input>` / `<select>` / `<textarea>` must have an associated `<label>` via `htmlFor`/`id`
- Use Headless UI `Field` + `Label` components for consistent association
- Error messages should use `aria-describedby` or `aria-errormessage`

---

## Linting

oxlint runs the `jsx_a11y` plugin with 14 accessibility rules at `"warn"` level. Currently **0 warnings, 0 errors** — all accessible patterns are enforced and all existing code is compliant.

The following rules are active:

| Rule                                     | Description                                         |
| ---------------------------------------- | --------------------------------------------------- |
| `alt-text`                               | Enforce `alt` attribute on `<img>`                  |
| `anchor-has-content`                     | Anchors must have accessible content                |
| `aria-props`                             | Valid `aria-*` property names                       |
| `aria-role`                              | Valid `role` values                                 |
| `aria-unsupported-elements`              | No ARIA on unsupported elements                     |
| `click-events-have-key-events`           | `onClick` must be paired with keyboard handler      |
| `heading-has-content`                    | Headings must have content                          |
| `iframe-has-title`                       | Iframes must have `title`                           |
| `label-has-associated-control`           | Labels must be associated with a control            |
| `no-noninteractive-element-interactions` | No interaction handlers on non-interactive elements |
| `no-redundant-roles`                     | No redundant ARIA roles                             |
| `no-static-element-interactions`         | No interaction handlers on static elements          |
| `role-has-required-aria-props`           | Roles have required ARIA properties                 |
| `tabindex-no-positive`                   | No positive `tabIndex` values                       |

Rules intentionally disabled (`"off"`) — may be enabled in the future:

- `control-has-associated-label`
- `media-has-caption`
- `no-noninteractive-tabindex`
- `prefer-tag-over-role`

### Suppressing false positives

For elements where keyboard handling is managed by a parent library (e.g., Headless UI `MenuItem`), use an inline suppression:

```tsx
// oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/click-events-have-key-events
```

### Stopping the build on new violations

All rules are `"warn"` — they surface issues during development but don't block CI. To promote a rule to error (blocking), change its level in `.oxlintrc.json`.

---

## Testing Checklist

Before submitting a PR, verify:

- [ ] All icon-only buttons have `aria-label`
- [ ] All interactive elements are keyboard-reachable (`Tab` key)
- [ ] Focus indicators are visible on all interactive elements (`focus-ring` class)
- [ ] Modals trap focus and have accessible titles (`DialogTitle`)
- [ ] New `<img>` elements have meaningful `alt` text
- [ ] `pnpm lint` passes with 0 errors
- [ ] Tooltips are visible on keyboard focus (not just hover)
- [ ] Custom interactive elements have `role`, `tabIndex={0}`, and `onKeyDown`
