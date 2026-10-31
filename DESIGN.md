# Haccora UK — DESIGN.md

## Design intent

Confident, accessible, operational and evidence-led rather than decorative. Prioritise *what needs attention now*, the current premises, accountable owner and next safe action. Design guidance is informed by Taste Skill, Impeccable and Awesome DESIGN.md, but Haccora's implementation remains its own.

## Authority: existing UI tokens and components

- **Colours:** reuse semantic `--background`, `--foreground`, `--card`, `--border`, `--primary`, `--destructive`, `--success` and `--warning` from `src/styles.css`. Red signals an actionable problem; green is permitted only for confirmed, narrowly defined evidence. Avoid 'all clear' for empty samples.
- **Typography:** preserve existing Archivo display / Inter body until a full licensed brand and legibility review. Dense task data uses sentence case and tabular numerals.
- **Structure:** one primary action per panel, persistent site/role context, scannable exception hierarchy and direct links to source evidence.
- **Components:** improve existing Radix and Haccora controls; focus rings, buttons, tables, empty states, badges and alert labels must be consistent.
- **Responsive:** check 320/375px phone, tablet and desktop layouts; avoid clipped translated strings, horizontal overflow and tiny controls.
- **Accessibility:** glove mode min 48px controls, WCAG AA contrast, keyboard and screen-reader navigation, descriptive failure/retry messages, reduced motion.
- **Motion:** subtle state feedback only, never motion as the sole conveyor of severity or status.

## Required states for every evidence screen

Loading, unavailable/error, partial/capped, authenticated empty, offline/pending sync, permission denied, needs review and completed with attributable evidence. Display the source window and whether a figure is a sample. No empty-as-compliant or invented operational score.

## Change review checklist

Use Taste Skill's redesign-first discipline, Impeccable critique/harden/adapt checks and DESIGN.md comparison for specific screens. Preserve known form names, routes, roles, safety semantics and country content. Run repository quality checks and authenticated browser/mobile reviews before release.
