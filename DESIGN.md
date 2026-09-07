# Design System: Clinical Clarity (Dentify)

## Brand Identity

**Dentify** is an AI-powered dental education platform designed for students and clinicians. The visual language, **Clinical Clarity**, emphasizes precision, hygiene, and academic rigor through a high-contrast, professional, and ultra-minimalist interface.

## Design Tokens

### Color Palette

Focused on medical cleanliness and high-tech precision.

#### Primary Colors

- **Clinical Blue (Action):** `#0077B6` (Primary action color, buttons, active states)
- **Sky Light:** `#F7F9FB` (Main page backgrounds)
- **Deep Slate:** `#191C1E` (Headings, primary text)

#### Functional Colors

- **Success/Completed:** `#006B5F` (Progress nodes, checkmarks)
- **Neutral/Inactive:** `#70787D` (Inactive icons, secondary text)
- **Surface:** `#FFFFFF` (Card backgrounds, elevated surfaces)
- **Border/Divider:** `#F2F4F6` (Thin separators)

### Typography

- **Primary Font:** `Manrope` (Sans-serif) - Used for headings and branding to convey modernity.
- **Secondary Font:** `Inter` (Sans-serif) - Used for technical data, labels, and body text for maximum legibility.

#### Type Scale

- **H1 (Screen Title):** 28px, Manrope Bold, tracking-tight
- **H2 (Section Header):** 18px, Manrope Bold
- **Body Large:** 16px, Inter Regular
- **Body Small:** 14px, Inter Regular
- **Technical/Caption:** 11px, Inter SemiBold, uppercase, tracking-wider

### Layout & Spacing

- **Base Grid:** 4px
- **Page Margin:** 24px (Horizontal)
- **Border Radius:**
  - **Large:** 32px (Bottom Navigation Bar top corners, main containers)
  - **Medium:** 24px (Dashboard cards, action buttons)
  - **Small:** 16px (Input fields, small widgets)
- **Device Proportion:** 390x884 (Mobile-first)

## Component Specifications

### 1. Navigation

#### Top App Bar

- **Height:** 64px
- **Layout:** Leading Logo ("Dentify"), Trailing User Avatar (minimalist circle).
- **Background:** White with 80% opacity and Backdrop Blur (20px).

#### Bottom Navigation Bar

- **Height:** 84px (including safe area)
- **Visual Style:** 4 Icons (Analytics, 3D View, Scanner, AI Chat).
- **Interaction:** Active icons are contained in a tonal circular or rounded-pill background. No text labels for a minimalist aesthetic.

### 2. Dashboard Components

- **Metric Cards:** Two-column grid showing "Racha" (Streak) and "XP Total".
- **Learning Path:** Vertical dotted line with circular nodes.
  - `Completed`: Solid blue/teal with checkmark.
  - `Active`: Larger, shadowed blue node.
  - `Locked`: Grayscale with padlock icon.

### 3. Medical Visualization

- **3D Viewer:** Full-width container with light background.
- **Scanner HUD:** Semi-transparent bounding boxes for dental identification.
  - `Identification Label`: Cyan background, black text.
  - `Confidence Score`: Progress bar with percentage.

## Design Principles

1. **Clinical Precision:** Every element must look intentional and scientifically accurate.
2. **Minimalism:** Remove non-essential text labels; rely on universally recognized clinical iconography.
3. **Information Hierarchy:** Crucial metrics and learning progress are prioritized through size and color weight.
4. **Consistency:** All screens must share the 390x884 proportion and the 4-icon navigation structure.

## NativeWind (Tailwind)

El sistema de estilos se migró a **NativeWind**: los design tokens están definidos una sola vez en `tailwind.config.js` (espejo de `constants/theme.ts`) y se consumen como utilidades Tailwind mediante `className` en `app/`, `components/` y `src/`. El tema es light-only.

### Implementación (NativeWind)

- Usar utilidades Tailwind (`className`) para color, tipografía, espacio, radios y bordes.
- Mantener `style` inline **solo** donde Tailwind no puede expresarlo: sombras (`createShadow()` / `elevation`), tamaños/alturas/porcentajes dinámicos, overlays `rgba`, `Canvas` de React Three Fiber, miniaturas de `expo-image`, `contentContainerStyle` de ScrollView/FlatList y swatches de color dinámicos.

### Mapa de tokens → utilidades

**Colores** (`tailwind.config.js` ↔ `constants/theme.ts`):

- Fondos: `bg-clinical-blue`, `bg-clinical-cyan`, `bg-sky-light`, `bg-surface`, `bg-success-teal`, `bg-success-tint`, `bg-error`, `bg-error-tint`, `bg-source-fill`
- Texto: `text-deep-slate`, `text-clinical-blue`, `text-neutral`, `text-muted`, `text-error`
- Bordes/separadores: `border-border-light`, `border-pill-border`
- Estados de presión/error: `clinical-dark` (presionado de clinical-blue), `teal-deep` (presionado de success-teal), `error-bright`, `error-tint-border`

**Tipografía:**

- `font-sans` → Inter (cuerpo, datos técnicos)
- `font-heading` → Manrope (títulos/marca)
- Variantes: `font-inter-semibold`, `font-inter-bold`, `font-heading-bold`
- La escala (H1 28px / H2 18px / body 16–14px / caption 11px) se aplica con utilidades de tamaño de Tailwind.

**Radios** (`borderRadius` en `tailwind.config.js`):

- `rounded-3xl` → 32px (bottom nav, contenedores grandes)
- `rounded-2xl` → 24px (tarjetas del dashboard, botones de acción)
- `rounded-xl` → 16px (inputs, widgets pequeños)
