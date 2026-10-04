---
name: Warm Editorial Travel
colors:
  surface: '#e9fef2'
  surface-dim: '#cadfd3'
  surface-bright: '#e9fef2'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#e3f9ec'
  surface-container: '#def3e7'
  surface-container-high: '#d8ede1'
  surface-container-highest: '#d2e7dc'
  on-surface: '#0d1f18'
  on-surface-variant: '#3f4947'
  inverse-surface: '#22342c'
  inverse-on-surface: '#e1f6ea'
  outline: '#6f7977'
  outline-variant: '#bfc9c6'
  surface-tint: '#256861'
  primary: '#00433e'
  on-primary: '#ffffff'
  primary-container: '#145c55'
  on-primary-container: '#91d2c9'
  inverse-primary: '#91d3c9'
  secondary: '#9e412d'
  on-secondary: '#ffffff'
  secondary-container: '#fe8b71'
  on-secondary-container: '#752311'
  tertiary: '#353d3a'
  on-tertiary: '#ffffff'
  tertiary-container: '#4c5451'
  on-tertiary-container: '#c0c8c4'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#adefe5'
  primary-fixed-dim: '#91d3c9'
  on-primary-fixed: '#00201d'
  on-primary-fixed-variant: '#005049'
  secondary-fixed: '#ffdad3'
  secondary-fixed-dim: '#ffb4a4'
  on-secondary-fixed: '#3d0600'
  on-secondary-fixed-variant: '#7f2a18'
  tertiary-fixed: '#dce4e0'
  tertiary-fixed-dim: '#c0c8c5'
  on-tertiary-fixed: '#161d1b'
  on-tertiary-fixed-variant: '#414846'
  background: '#e9fef2'
  on-background: '#0d1f18'
  surface-variant: '#d2e7dc'
typography:
  headline-lg:
    fontFamily: Noto Serif
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Noto Serif
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 26px
  title-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 18px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.02em
  price-display:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 22px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1.25rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.25rem
  space-xl: 1.5rem
---

## Brand & Style

This design system blends an editorial travel publication ethos with high-utility mobile booking mechanics. The visual character evokes serenity, understated sophistication, and warm hospitality, prioritizing architectural clarity and honest transparency over aggressive promotional tactics.

The design movement anchors in **Tactile Minimalism with Editorial Accents**:
- Generous cream-toned negative space that calms decision fatigue.
- Deliberate pairings of literary serif typography with high-legibility geometric sans-serifs.
- Low-contrast structural framing using delicate borders and tinted atmospheric depths rather than synthetic blurs or stark dropshadows.
- Clear, tactile touch interaction points designed explicitly for single-handed thumb reach and mobile ergonomics.

## Colors

The palette draws from natural environments—deep coastal pine, sun-baked earth, and unbleached linen:

- **Primary Deep Teal (`#145C55`)**: Drives core calls to action, high-priority highlights, and active navigation indicators. Conveys grounded security and premium authenticity.
- **Supporting Terracotta (`#A64732`)**: Used judiciously for urgency triggers (e.g., "Rare find", "Few dates left"), promotional badges, and secondary action highlights.
- **Warm Canvas (`#FAF7F2`)**: Replaces stark white for application backgrounds, dampening glare and providing an organic, tactile paper quality.
- **Card Surface (`#FFFFFF`)**: Pure white reserved for elevated cards, modal sheets, and content containers to create clean separation against the warm canvas.
- **Soft Supporting Surface (`#EAF2EE`)**: A soft sage-tinted tint used for pill filters, selected amenities, secondary container backgrounds, and subtle callouts.
- **Primary Ink (`#25372F`)**: A softened deep spruce used for primary headings, essential data points, and body copy to eliminate the harshness of pure black.
- **Secondary Ink (`#66716A`)**: Mid-tone slate for supporting metadata, captions, timestamps, and inactive controls.
- **Border / Outline (`#E4E7E1`)**: Subtle, natural perimeter stroke that anchors cards and dividing lines without visual clutter.
- **Destructive / Error (`#B42318`)**: Reserved exclusively for booking alerts, critical input errors, and cancellations.

## Typography

The type system implements a deliberate division of labor:
- **Serif (`Noto Serif`)**: Delivers editorial poise, used exclusively for large page introductions, home discovery headers, and property title displays. It establishes the tranquil rhythm of an architectural publication.
- **Sans-Serif (`Plus Jakarta Sans`)**: Delivers razor-sharp clarity for functional elements: prices, date ranges, interactive inputs, navigation labels, specifications, and amenity tags.

Numerical values such as pricing, reviews, and dates must be rendered in `Plus Jakarta Sans` with proportional or tabular figures enabled to prevent layout shifting during real-time calculation.

## Layout & Spacing

Designed primarily for mobile-first constraints with a base reference frame of 390px (iPhone viewport standard).

- **Grid and Framing**: 
  - Standard horizontal margin: `1.25rem` (20px / `px-5`) to maximize screen efficiency while maintaining editorial breathing room.
  - Column grid: 4 columns for mobile, dynamic spacing for fluid horizontal carousels that bleed 20px offscreen to indicate continuous swipeability.
- **Safe Area Insets**:
  - Top safe margins dynamically respect dynamic islands and notches with minimum 44px clearance.
  - Bottom navigation bars incorporate `env(safe-area-inset-bottom)` plus 16px of buffer to preserve single-thumb ergonomics.
- **Form Factors**:
  - Tablet & Desktop reflow wraps mobile feed items into an adaptive 2-column or 3-column card grid centered with a max-width container of `1120px`.

## Elevation & Depth

This system avoids heavy, artificial dropped shadows, leaning into warm ambient depth, structural borders, and physical layering:

- **Level 0 (Base Canvas)**: Background rendered in `#FAF7F2`. Flat, un-elevated.
- **Level 1 (Card Default)**: Rendered in `#FFFFFF` with a single 1px hairline border in `#E4E7E1`. Ambient shadow: `0px 2px 8px rgba(37, 55, 47, 0.04)`.
- **Level 2 (Active Sheets & Sticky Bars)**: Bottom sheets, sticky booking footers, and floating search pills use `#FFFFFF` backed by `0px -4px 16px rgba(37, 55, 47, 0.06)` with a 1px top border in `#E4E7E1`.
- **Level 3 (Modals & Overlays)**: Full modal overlays dim background with `#25372F` at 40% opacity, providing calm focus without harsh blackout.

## Shapes

The design uses a cohesive organic geometry with an explicit 16px (`1rem` / `rounded-2xl`) radius baseline for all primary visual envelopes (stay cards, bottom sheets, form groupings, and hero imagery). 

- Standard Cards & Media: `16px` radius.
- Buttons & Search Bars: `16px` radius or full pill (`9999px`) for floating quick-action chips.
- Inner elements (nested within cards) drop to `8px` or `12px` to preserve visual concentricity.

## Components

### Buttons
- **Primary Action**: 52px height (`h-[52px]`), background `#145C55`, text `#FFFFFF`, font-weight 600, border-radius 16px. Full-width on mobile booking sheets. Press state scales down to `0.98` with subtle brightness decrease.
- **Secondary Action**: 52px height, background `#EAF2EE`, text `#145C55`, border 1px solid transparent, font-weight 600.
- **Tertiary / Ghost**: 48px min touch target, text `#25372F`, transparent background, underlined text or subtle chevron indicator.

### Input Fields
- Height 52px with 16px horizontal internal padding. Background `#FFFFFF`, 1px solid `#E4E7E1` border.
- Text rendered in 16px `Plus Jakarta Sans` to prevent iOS zoom-on-focus.
- Active state transitions border to `#145C55` with a subtle focus ring (`0 0 0 3px rgba(20, 92, 85, 0.12)`).
- Error state switches border to `#B42318` with 13px helper copy below.

### Cards (Property Listing)
- Pure white container with 16px radius, enclosed by 1px `#E4E7E1`.
- Top image container cropped at 4:3 or 16:10 aspect ratio with 16px top corners. Heart/Wishlist icon positioned top-right with 40x40px touch zone, soft semi-opaque backdrop blur.
- Editorial headline (`Noto Serif`, 18–20px) paired directly with clean sans-serif pricing badge (`$XXX / night` with price bolded).

### Filter Chips & Badges
- **Unselected Filter**: 36px height, pill-shaped (`rounded-full`), `#FFFFFF` background, `#E4E7E1` border, `#25372F` text, 13px font-medium.
- **Active Filter**: `#145C55` background, `#FFFFFF` text, border `#145C55`.
- **Editorial Tag ("Rare Find")**: `#A64732` text, `#FAF7F2` background with `#A64732` 1px border, 11px font-semibold uppercase.

### Sticky Booking Bar
- Pinned to bottom viewport edge above safe area.
- Two-column layout: Left column hosts price breakdown per night and total calculation; right column hosts primary CTA "Reserve" (52px tall, min 140px width).
- Separated from canvas by 1px `#E4E7E1` top border and Level 2 elevation shadow.