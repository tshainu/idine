# iDine POS — Design System

## Brand
- **Name:** iDine
- **Tagline:** Premium Restaurant POS

## Color Palette
```
--color-bg:           #0D0618   /* deepest background */
--color-surface:      #1A0A2E   /* card/panel bg */
--color-surface-2:    #241040   /* elevated surface */
--color-border:       #3D1F6E   /* borders, dividers */
--color-gold:         #F5A623   /* primary accent — gold */
--color-gold-dark:    #C47D0E   /* gold hover/pressed */
--color-gold-light:   #FBBF45   /* gold highlight */
--color-purple:       #7C3AED   /* secondary accent */
--color-purple-light: #A78BFA   /* purple highlight */
--color-success:      #22C55E   /* green — done/paid */
--color-warning:      #EAB308   /* yellow — pending */
--color-danger:       #EF4444   /* red — cancel/error */
--color-text:         #F8F4FF   /* primary text */
--color-text-muted:   #A898C8   /* muted/secondary text */
--color-text-dim:     #6B5A8E   /* very dim text */
```

## Typography
- **Font family:** Poppins (Google Fonts)
- **Display:** Poppins 700 — headings, order numbers, totals
- **Body:** Poppins 400/500 — labels, descriptions
- **Mono:** JetBrains Mono — prices, numbers, order IDs

### Scale
- xs: 10px
- sm: 12px
- base: 14px
- md: 16px
- lg: 20px
- xl: 24px
- 2xl: 32px

## Spacing
- Unit: 4px base
- Compact padding: 8px (dense POS UI)
- Standard padding: 12–16px
- Section gap: 24px

## Layout Principles
- **POS screen:** 3-column layout (320px left | flex center | 320px right)
- **KDS screen:** Full-width card grid, ticket-board style
- **Waiter app:** Single-column mobile, bottom tab nav
- **Admin:** Sidebar + content layout
- Density: HIGH — POS screens need maximum information on screen
- No decorative whitespace — every pixel earns its place

## Component Style
- **Buttons:** Rounded corners (8px), gold fill for primary, purple outline for secondary, flat for danger
- **Cards:** Surface bg (#1A0A2E), 1px border (#3D1F6E), 8px radius
- **Inputs:** Dark bg (#0D0618), gold border on focus, white text
- **Badges/Pills:** Compact, uppercase, bold — e.g. DINE IN, TAKE AWAY
- **Order items:** Tight table rows with zebra stripe (#241040 alternate)
- **Menu cards:** 2-3 column grid, image top, name + price bottom, gold hover ring

## Motion
- Page load: subtle fade + slide up (150ms)
- Button press: scale 0.97 (80ms)
- Order placed: brief gold flash on panel
- KDS new ticket: slide-in from right
- No heavy animations — this is a working POS, not a landing page

## Anti-patterns (avoid)
- White/light backgrounds
- Purple gradients on white
- Rounded pill buttons everywhere
- Large hero sections
- Excessive padding/whitespace

## POS-specific UX patterns
- Keyboard shortcuts for common actions (F1=Place Order, F2=Draft, ESC=Cancel)
- Large tap targets for menu items (touchscreen billing PC)
- Color-coded order types: DINE IN=gold, TAKE AWAY=purple, DELIVERY=blue
- Color-coded order status: pending=yellow, confirmed=green, cancelled=red
- Running orders list — most recent on top
- Menu grid items — highlight on hover with gold ring, immediate click feedback
