# @zeroqs/liquid-toggle

Liquid-glass segmented toggle for React. The sliding thumb is a real refractive lens: a WebGL fragment shader samples a canvas copy of the track with displaced coordinates — the same way native Liquid Glass works — instead of emulating it with SVG `backdrop-filter` hacks.

**Why not `backdrop-filter: url(#svg)`?** That approach only renders in Chromium, forces a CPU rebuild of displacement maps (ray tracing → `ImageData` → PNG encode → PNG decode) on every geometry change, and re-rasterizes the filter surface on every frame the element scales. The canvas approach runs one GPU pass over a ~200×60 quad, works in every browser with WebGL, and animating the lens — position, squash & stretch — costs a single uniform update per frame.

**The trade-off:** the shader can only refract what it can sample. The toggle owns its opaque track (pill, border, labels) and replicates it onto a canvas texture — so the effect is self-contained and does _not_ refract arbitrary page content behind the component. Labels must be plain strings for the same reason.

## Install

```bash
npm install @zeroqs/liquid-toggle
```

React ≥ 18 is a peer dependency.

## Usage

```tsx
import { LiquidToggle } from "@zeroqs/liquid-toggle";

function Tabs() {
  const [tab, setTab] = useState("first");

  return (
    <LiquidToggle
      value={tab}
      onChange={setTab}
      itemWidth={140}
      options={[
        { id: "first", label: "First" },
        { id: "second", label: "Second" },
      ]}
    />
  );
}
```

### Customization

Every knob lives in one config object. Pass partial overrides via the `config` prop — they merge onto `LIQUID_TOGGLE_DEFAULT_CONFIG`:

```tsx
<LiquidToggle
  value={tab}
  onChange={setTab}
  options={options}
  config={{
    glass: { strength: 10, cornerBoost: 2 },
    appearance: { color: "#7C3AED", trackBackground: "#F5F3FF" },
    physics: { wobble: false },
  }}
/>
```

## Props

| Prop                 | Type                              | Default | Description                                                                              |
| -------------------- | --------------------------------- | ------- | ---------------------------------------------------------------------------------------- |
| `value`              | `string \| null`                  | —       | Selected option id (controlled). `null` / unknown id hides the thumb.                    |
| `onChange`           | `(id: string) => void`            | —       | Fired on click or drag release.                                                          |
| `options`            | `{ id: string; label: string }[]` | —       | Options in display order. Labels must be strings (the lens draws a canvas copy of them). |
| `itemWidth`          | `number`                          | `160`   | Width of one option cell, px.                                                            |
| `separator`          | `boolean`                         | `false` | 1px separators between options.                                                          |
| `config`             | `LiquidToggleConfigOverrides`     | —       | Partial config overrides (see below).                                                    |
| `className`, `style` | —                                 | —       | Applied to the root element.                                                             |

## Config reference

### `glass` — the optics

| Key               | Default             | What it does                                                                                                                                                                                                                     |
| ----------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `strength`        | `7`                 | Maximum displacement at the rim, px. The master intensity knob.                                                                                                                                                                  |
| `bezelWidth`      | `9`                 | Width of the refracted band along the rim, px. Wider = the smear reaches deeper into the lens.                                                                                                                                   |
| `axisStrength`    | `{ x: 1, y: 0.25 }` | Per-axis damping of the displacement. The lens is taller than the track, so its top/bottom rim sits on the 1px track border — full vertical displacement would smear that line into thick bands. Left/right stays at full force. |
| `cornerBoost`     | `1.5`               | Displacement multiplier on the rounded ends of the capsule. Makes the content visibly bend along the lens curve; the flat top/bottom stays calm. `1` disables.                                                                   |
| `cornerSpread`    | `0.45`              | How far the boosted corner zone stretches along the arc (an exponent). `1` = tight diagonal wedge, lower values = the bend runs the whole arc.                                                                                   |
| `aberration`      | `0.08`              | Chromatic aberration: red samples at `1 + a`, blue at `1 − a` of the displacement. `0` disables; large values show magenta fringes.                                                                                              |
| `specularOpacity` | `0.5`               | Rim-light opacity along the lens edge.                                                                                                                                                                                           |
| `lightAngle`      | `π/3`               | Direction the rim light comes from, radians.                                                                                                                                                                                     |
| `quality`         | `2`                 | Supersampling of the lens canvas and track texture. `2` keeps text crisp on retina.                                                                                                                                              |

### `physics` — motion

| Key                                      | Default         | What it does                                                                                                                                                    |
| ---------------------------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `wobble`                                 | `true`          | Squash & stretch while the thumb moves. Cheap here (GPU transform of a composited canvas) — this is the animation that SVG-filter implementations must disable. |
| `attraction`                             | `0.4`           | Fraction of the remaining distance covered per frame. Higher = snappier settle.                                                                                 |
| `stretchPerSpeed` / `maxStretch`         | `0.02` / `0.35` | How velocity maps to stretch during the settle animation, and its cap.                                                                                          |
| `dragStretchPerSpeed` / `dragMaxStretch` | `0.05` / `0.4`  | Same, while dragging.                                                                                                                                           |
| `wobbleLerp`                             | `0.2`           | Per-frame smoothing of the wobble scales.                                                                                                                       |
| `edgeResistance`                         | `3`             | Rubber-band divisor when dragging past the track edges.                                                                                                         |
| `settleDistance` / `settleWobble`        | `0.1` / `0.01`  | Thresholds below which the animation snaps to rest and the rAF loop stops.                                                                                      |
| `labelFadeLerp`                          | `0.25`          | Convergence speed of the canvas label opacities; should visually match the 0.15s CSS fade of the DOM labels.                                                    |

### `appearance` — colors

| Key                                               | Default     | What it does                                                                                                                                      |
| ------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `color`                                           | `#1E6DF6`   | Accent: thumb ring, and the fallback for `textColor` / `borderColor`.                                                                             |
| `textColor`                                       | —           | Label color. Falls back to `color`.                                                                                                               |
| `borderColor`                                     | —           | Track border color. Falls back to `color`.                                                                                                        |
| `trackBackground`                                 | `#EDF2FA`   | Track fill.                                                                                                                                       |
| `separatorColor`                                  | `#C1D2EF`   | Separator color.                                                                                                                                  |
| `item.selectedOpacity` / `item.unselectedOpacity` | `1` / `0.6` | Label opacity per selection state.                                                                                                                |
| `item.selectedScale` / `item.unselectedScale`     | `1` / `1`   | Label scale per state. Keep at `1`: the canvas copy of a label cannot follow a DOM scale transition, a mismatch shows as a seam at the lens edge. |

### `layout` / `thumb` — geometry

| Key                            | Default       | What it does                                                                                        |
| ------------------------------ | ------------- | --------------------------------------------------------------------------------------------------- |
| `layout.height`                | `44`          | Track height, px.                                                                                   |
| `layout.itemWidth`             | `160`         | Default option cell width (the `itemWidth` prop wins).                                              |
| `layout.fontSize`              | `"12px"`      | Label font size.                                                                                    |
| `thumb.height`                 | `38`          | Thumb layout height, px.                                                                            |
| `thumb.radius`                 | `19`          | Corner radius of the decorative ring.                                                               |
| `thumb.scale` / `thumb.scaleY` | `1.3` / `1.2` | Visual scale of the lens over its layout size; this is what makes the lens overlap the track edges. |

## How it works

1. **Track texture** — the pill, border, separators and labels are drawn into an offscreen 2d canvas (with a transparent margin, so the sampler never clamps into the border color). The label font is read from the DOM via `getComputedStyle`, so the copy matches the real labels pixel-for-pixel.
2. **Lens** — a `<canvas>` the size of the thumb runs a single-quad fragment shader: signed-distance field of the capsule → surface normal → displacement toward the center (strongest at the rim, boosted along the arcs), three texture reads with slightly different offsets for chromatic aberration, plus a rim light.
3. **Animation** — position, wobble and label fades live in refs and are flushed straight to the DOM/GL each `requestAnimationFrame`; React does not re-render during movement. The only per-frame GL cost is one `uniform2f` and one draw call.
4. **Fallback** — if WebGL is unavailable, the thumb renders as a translucent frosted pill.

## Development

```bash
vp install   # install dependencies
vp test      # run unit tests
vp check     # format, lint, type check
vp pack      # build the library
```

## Docs

A [fumadocs](https://fumadocs.dev) site lives in `docs/` — it explains how the effect works and hosts a live playground where every config value can be tweaked with sliders (the resulting `config` prop is printed as copy-pasteable JSON).

```bash
vp pack                          # the docs consume the built dist
cd docs && pnpm dev              # http://localhost:3000/docs
```

## License

MIT
