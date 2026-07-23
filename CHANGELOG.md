# Changelog

All notable changes to `@zeroqs/liquid-toggle` are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- **Icons in options** — `LiquidToggleOption` accepts an optional `icon`
  (an image source, so the canvas track texture can draw the exact same
  icon and the lens refracts it like everything else):

  ```tsx
  options={[
    { id: "objects", label: "Trade objects", icon: { src: "/icons/cube.svg" } },
  ]}
  ```

  `width`/`height` default to the new `config.layout.iconSize` (16 px), the
  gap before the label to `config.layout.iconGap` (6 px). PNG, WebP, SVG and
  data URLs are supported; cross-origin sources need CORS headers. Icons that
  fail to load fall back to label-only rendering. The texture rebuilds
  automatically when an icon finishes decoding. Text-only options are
  unchanged — no migration needed.

- **Playground**: an `option.icon` checkbox to try icons live.

## [0.2.0] — 2026-07-08

### Added

- **`physics.animated` config switch** — turn off all motion with a single flag:

  ```tsx
  <LiquidToggle config={{ physics: { animated: false } }} … />
  ```

  When `false`, the thumb snaps to the selected option instantly — no spring,
  no squash & stretch, no label fades (both the DOM labels and their canvas
  copies under the lens switch opacity in sync). The rAF loop settles in a
  single frame, and dragging still follows the pointer directly. The glass
  lens itself — refraction, chromatic aberration, rim light — stays fully
  functional. Defaults to `true`, so existing setups are unaffected.

  Pairs well with reduced-motion support on the app side:

  ```tsx
  config={{ physics: { animated: !matchMedia("(prefers-reduced-motion: reduce)").matches } }}
  ```

- **Playground**: a `physics.animated` checkbox on the
  [docs playground](https://liquid-toggle.vercel.app/docs/playground) to try
  the switch live.

## [0.1.1] — 2026-07-08

### Changed

- Package `homepage` now points to the documentation site:
  <https://liquid-toggle.vercel.app/docs>.

_No library code changes._

## [0.1.0] — 2026-07-08

Initial release. 🎉

- **`<LiquidToggle />`** — a liquid-glass segmented toggle for React. The
  sliding thumb is a WebGL lens over a canvas copy of the track — no
  `backdrop-filter`, no SVG filters, works in every browser with WebGL 1.
- **Glass optics on the GPU**: capsule SDF refraction with a configurable
  bezel, per-axis displacement, corner boost along the rounded ends,
  chromatic aberration and a rim light — all in a single fragment-shader pass.
- **Spring physics**: attraction-based thumb movement with squash & stretch
  ("wobble"), tunable via `config.physics`. The rAF loop stops completely
  once settled — zero idle cost.
- **Drag support**: pointer-events based (mouse + touch), with rubber-band
  resistance past the track edges.
- **Full theming** via `config.appearance` (colors, label opacities) and
  `config.layout` / `config.thumb` / `config.glass` for geometry and optics.
- **Graceful fallback**: if WebGL is unavailable, the toggle stays fully
  functional with a translucent thumb instead of the lens.

[0.2.0]: https://github.com/zeroqs/liquid-toggle/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/zeroqs/liquid-toggle/releases/tag/v0.1.1
[0.1.0]: https://www.npmjs.com/package/@zeroqs/liquid-toggle/v/0.1.0
