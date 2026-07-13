---
name: Lumina Learning
colors:
  surface: '#fff4f4'
  surface-dim: '#ffc6d0'
  surface-bright: '#fff4f4'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#ffecee'
  surface-container: '#ffe1e5'
  surface-container-high: '#ffd9df'
  surface-container-highest: '#ffd1d9'
  on-surface: '#4c212c'
  on-surface-variant: '#814c58'
  inverse-surface: '#24020c'
  inverse-on-surface: '#ca8c98'
  outline: '#a06773'
  outline-variant: '#dc9ca8'
  surface-tint: '#af2330'
  primary: '#af2330'
  on-primary: '#ffefee'
  primary-container: '#ff7576'
  on-primary-container: '#4e000a'
  inverse-primary: '#f9595f'
  secondary: '#9e3655'
  on-secondary: '#ffeff0'
  secondary-container: '#ffc2cd'
  on-secondary-container: '#842141'
  tertiary: '#7144aa'
  on-tertiary: '#faefff'
  tertiary-container: '#c99dff'
  on-tertiary-container: '#440e7c'
  error: '#b02500'
  on-error: '#ffefec'
  error-container: '#f95630'
  on-error-container: '#520c00'
  primary-fixed: '#ff7576'
  primary-fixed-dim: '#fc5c61'
  on-primary-fixed: '#000000'
  on-primary-fixed-variant: '#60000f'
  secondary-fixed: '#ffc2cd'
  secondary-fixed-dim: '#ffadbe'
  on-secondary-fixed: '#6a0a2f'
  on-secondary-fixed-variant: '#902b4a'
  tertiary-fixed: '#c99dff'
  tertiary-fixed-dim: '#bd8df9'
  on-tertiary-fixed: '#25004b'
  on-tertiary-fixed-variant: '#4d1c85'
  primary-dim: '#9e1425'
  secondary-dim: '#8e2a49'
  tertiary-dim: '#65379d'
  error-dim: '#b92902'
  background: '#fff4f4'
  on-background: '#4c212c'
  surface-variant: '#ffd1d9'
typography:
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 38px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-caps:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  character-display:
    fontFamily: Noto Serif
    fontSize: 64px
    fontWeight: '500'
    lineHeight: 80px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 48px
  xl: 80px
  gutter: 16px
  margin-mobile: 20px
  margin-desktop: auto
  max-width: 1200px
---

## Brand & Style
The design system is built on a foundation of **Modern Minimalism** infused with **Optimistic Professionalism**. The target audience comprises dedicated language learners seeking a structured yet inviting digital environment. The UI is designed to reduce cognitive load, transforming the often-intimidating process of learning Mandarin into a series of clear, achievable, and visually vibrant interactions.

The emotional response is one of "focused energy." By utilizing expansive whitespace and a more vibrant, expressive color palette, the system encourages long study sessions while maintaining a high level of engagement. The aesthetic combines the efficiency of a high-end SaaS product with the warmth and vitality of a modern educational institution.

## Colors
The palette is a strategic balance between energetic warmth and sophisticated depth, utilizing a vibrant derivation logic to increase saturation and visual interest.
- **Mandarin Red (#D64048):** The primary brand color. Used for major actions, critical progress markers, and primary buttons to provide a bold, energetic focal point.
- **Deep Rose (#C15170):** The secondary color, used for supporting interactive elements and secondary navigation to complement the primary red with a softer, sophisticated tone.
- **Amethyst Purple (#8E60C8):** The tertiary color, reserved for specialized accents, bonus content, or distinct category markers to add a layer of creative depth.
- **Muted Rosé Neutrals (#A06773):** Backgrounds and surfaces leverage a warm, tinted neutral base to ensure the interface feels cohesive and welcoming rather than sterile.

## Typography
This design system employs a tiered typographic strategy to handle both UI navigation and linguistic study. 
- **Plus Jakarta Sans** provides a friendly, contemporary feel for headlines and brand-level messaging. It is also used for labels to create a more unified brand voice.
- **Inter** is utilized for body text and functional UI elements due to its exceptional legibility and neutral tone.
- **Noto Serif** is designated for Mandarin characters (Hanzi). Its refined strokes and traditional proportions ensure that complex characters remain clear and aesthetically elegant even at smaller sizes.

For mobile layouts, headline sizes scale down to prevent awkward line breaks, while body text remains at a legible 16px-18px range to ensure comfort during reading-heavy lessons.

## Layout & Spacing
The layout follows a **Fluid Grid** model with a maximum content width to prevent line lengths from becoming unreadable on ultra-wide monitors. 

- **Desktop:** A 12-column grid with 24px gutters. Sidebars for navigation are fixed at 280px, while the main content area remains fluid.
- **Mobile:** A 4-column grid with 20px side margins. Vertical stacking is the default for all card-based content.
- **Rhythm:** Spacing follows an 8px baseline power-of-two scale. Use `lg` (48px) for separating major sections and `md` (24px) for internal component padding to maintain a sense of "breathability."

## Elevation & Depth
To maintain a modern and clean look, this design system avoids heavy drop shadows. Instead, it uses **Tonal Layers** and **Ambient Shadows** tinted with the brand's warmer neutral tones.

1.  **Level 0 (Base):** Subtle background tints based on the neutral palette.
2.  **Level 1 (Cards/Containers):** Surfaces with a subtle 1px border derived from the neutral outline color to define boundaries without adding visual weight.
3.  **Level 2 (Active States):** An ambient, highly-diffused shadow tinted with the secondary color (rgba(193, 81, 112, 0.08)) is applied to active learning cards or modals to make them "pop" against the base layer.
4.  **Glassmorphism:** Navigation bars and sticky headers use a subtle backdrop-blur (12px) with 90% opacity to maintain context of the content scrolling beneath them.

## Shapes
The shape language is consistently **Rounded**, reflecting the "approachable" brand personality. 

- UI Buttons and Input fields use a standard 0.5rem (8px) radius.
- Learning Cards and large containers use the `rounded-lg` (1rem / 16px) radius to create a soft, non-threatening container for educational content.
- Progress bars and pill-shaped tags use the `rounded-xl` (1.5rem / 24px) or full-round settings to differentiate them from interactive square-ish elements.

## Components
- **Buttons:** Primary buttons are Solid Mandarin Red (#D64048) with white text. Secondary buttons use a Deep Rose outline with a transparent background. All buttons have a height of 48px for better touch targets.
- **Learning Cards:** Feature a Level 1 elevation. When a user interacts (hover/tap), they transition to Level 2 elevation with a subtle warm-tinted shadow. Character display cards should center the Noto Serif Hanzi at a large scale (64px+).
- **Progress Indicators:** Linear bars use a Tertiary Amethyst background with a primary Mandarin Red fill. Circular indicators are used for daily goal tracking.
- **Inputs:** Text fields use a 1px Deep Rose border when focused, accompanied by a soft glow. Labels are always positioned above the field in `label-caps` style using Plus Jakarta Sans.
- **Chips/Tags:** Used for tone markers or grammatical categories. These use low-saturation versions of the tertiary and secondary colors to avoid competing with primary actions.
- **Cultural Accents:** Subtle background patterns utilizing modernized "Seigaiha" (wave) or "FangSheng" (interlocking squares) patterns at 2% opacity add a layer of cultural depth without distracting from the text.