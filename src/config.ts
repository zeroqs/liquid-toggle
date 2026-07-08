/** Static geometry of the toggle track. */
export interface LiquidToggleLayoutConfig {
  /** Track height, px. */
  height: number;
  /** Default width of one option cell, px (overridable per instance via the `itemWidth` prop). */
  itemWidth: number;
  /** Font size of the option labels (any CSS value, e.g. `"12px"`). */
  fontSize: string;
}

/** Geometry and idle transform of the sliding thumb (the glass lens). */
export interface LiquidToggleThumbConfig {
  /** Layout height of the thumb, px (before `scale`/`scaleY` are applied). */
  height: number;
  /** Corner radius of the decorative ring around the thumb, px. */
  radius: number;
  /**
   * Uniform scale applied to the thumb on top of its layout size. Values > 1
   * make the lens visually larger than the track row it slides in.
   */
  scale: number;
  /** Extra vertical scale multiplied with `scale`; > 1 makes the lens taller than wide. */
  scaleY: number;
}

/** Optics of the WebGL lens. All distances are in CSS px of the *visual* (scaled) lens. */
export interface LiquidToggleGlassConfig {
  /**
   * Supersampling factor for the lens canvas and the track texture.
   * 2 keeps text crisp on retina displays; higher values cost GPU memory.
   */
  quality: number;
  /**
   * Width of the refracted band along the rim, px. Displacement is zero at the
   * inner edge of this band and reaches `strength` at the very rim — a wider
   * bezel means the "liquid" smear reaches deeper into the lens.
   */
  bezelWidth: number;
  /** Maximum displacement at the very rim, px. The master intensity knob. */
  strength: number;
  /**
   * Per-axis weight of the displacement vector (0..1 each). The lens is usually
   * taller than the track, so its top/bottom rim sits right on the track border;
   * damping `y` keeps that 1px line from smearing into thick streaks while the
   * left/right refraction stays at full force.
   */
  axisStrength: { x: number; y: number };
  /**
   * Displacement multiplier on the diagonal arcs of the capsule (the rounded
   * ends). 1 = no boost; 1.5 makes the content visibly bend along the lens
   * curve while the flat top/bottom stays calm. On the arcs the vertical
   * displacement is also restored to full force regardless of `axisStrength.y`.
   */
  cornerBoost: number;
  /**
   * How far the `cornerBoost` zone stretches along the arc. It is an exponent:
   * 1 confines the boost to a tight diagonal wedge, values < 1 spread it along
   * the whole arc (0.45 ≈ from the end of the flat top edge down to the side).
   */
  cornerSpread: number;
  /**
   * Chromatic aberration: relative spread between the red and blue sample
   * offsets (red is displaced by `1 + aberration`, blue by `1 - aberration`).
   * 0 disables it. Keep it small — large values show as magenta fringes.
   */
  aberration: number;
  /** Opacity of the rim light along the lens edge, 0..1. */
  specularOpacity: number;
  /** Direction the rim light comes from, radians (0 = from the right, π/2 = from below). */
  lightAngle: number;
}

/** Spring physics of the thumb and the squash & stretch animation. */
export interface LiquidTogglePhysicsConfig {
  /**
   * Master animation switch. When `false` the thumb snaps to the selected
   * option instantly — no spring, no wobble, no label fades (dragging still
   * follows the pointer). The glass lens itself stays fully functional.
   */
  animated: boolean;
  /**
   * Enables squash & stretch ("wobble") while the thumb moves. The lens is a
   * GPU-composited canvas, so scaling it every frame is cheap — unlike SVG
   * backdrop filters, where the same animation forces per-frame re-rasterization.
   */
  wobble: boolean;
  /** Fraction of the remaining distance the thumb covers per frame (0..1); higher = snappier. */
  attraction: number;
  /** Smoothing factor for the wobble scales per frame (0..1). */
  wobbleLerp: number;
  /** How much stretch one px/frame of velocity adds during the settle animation. */
  stretchPerSpeed: number;
  /** Stretch cap during the settle animation (0.35 = up to 135% width). */
  maxStretch: number;
  /** How much stretch one px/frame of velocity adds while dragging. */
  dragStretchPerSpeed: number;
  /** Stretch cap while dragging. */
  dragMaxStretch: number;
  /** Rubber-band divisor past the track edges while dragging (3 = a third of the overshoot). */
  edgeResistance: number;
  /** Distance to the target, px, below which the position snaps and the loop stops. */
  settleDistance: number;
  /** Wobble deviation from 1 below which the scale snaps back to rest. */
  settleWobble: number;
  /**
   * Per-frame smoothing for the canvas copies of the label opacities. Should
   * roughly match the CSS opacity transition of the DOM labels (0.15s) so the
   * copy under the lens fades in sync with the label outside it.
   */
  labelFadeLerp: number;
}

/** Colors and option-state styling. Keep these in sync with the app theme. */
export interface LiquidToggleAppearanceConfig {
  /**
   * Accent color: the decorative ring around the thumb, and the fallback for
   * `textColor` / `borderColor` when they are not set.
   */
  color: string;
  /** Label color. Falls back to `color`. */
  textColor?: string;
  /** Track border color. Falls back to `color`. */
  borderColor?: string;
  /** Track fill color. */
  trackBackground: string;
  /** Color of the optional separators between options. */
  separatorColor: string;
  /** Opacity / scale of the option labels depending on selection state. */
  item: {
    /** Label opacity when its option is selected. */
    selectedOpacity: number;
    /** Label opacity when its option is not selected. */
    unselectedOpacity: number;
    /**
     * Label scale when selected. Keep at 1: the canvas draws its own copy of
     * the labels, and a scale mismatch between the DOM label and its canvas
     * twin shows up as a seam at the lens edge.
     */
    selectedScale: number;
    /** Label scale when not selected. */
    unselectedScale: number;
  };
}

/** Full resolved configuration of the toggle. */
export interface LiquidToggleConfig {
  layout: LiquidToggleLayoutConfig;
  thumb: LiquidToggleThumbConfig;
  glass: LiquidToggleGlassConfig;
  physics: LiquidTogglePhysicsConfig;
  appearance: LiquidToggleAppearanceConfig;
}

/** Per-section partial overrides accepted by the `config` prop. */
export interface LiquidToggleConfigOverrides {
  layout?: Partial<LiquidToggleLayoutConfig>;
  thumb?: Partial<LiquidToggleThumbConfig>;
  glass?: Partial<Omit<LiquidToggleGlassConfig, "axisStrength">> & {
    axisStrength?: Partial<LiquidToggleGlassConfig["axisStrength"]>;
  };
  physics?: Partial<LiquidTogglePhysicsConfig>;
  appearance?: Partial<Omit<LiquidToggleAppearanceConfig, "item">> & {
    item?: Partial<LiquidToggleAppearanceConfig["item"]>;
  };
}

export const LIQUID_TOGGLE_DEFAULT_CONFIG: LiquidToggleConfig = {
  layout: {
    height: 44,
    itemWidth: 160,
    fontSize: "12px",
  },
  thumb: {
    height: 38,
    radius: 19,
    scale: 1.3,
    scaleY: 1.2,
  },
  glass: {
    quality: 2,
    bezelWidth: 9,
    strength: 7,
    axisStrength: { x: 1, y: 0.25 },
    cornerBoost: 1.5,
    cornerSpread: 0.45,
    aberration: 0.08,
    specularOpacity: 0.5,
    lightAngle: Math.PI / 3,
  },
  physics: {
    animated: true,
    wobble: true,
    attraction: 0.4,
    wobbleLerp: 0.2,
    stretchPerSpeed: 0.02,
    maxStretch: 0.35,
    dragStretchPerSpeed: 0.05,
    dragMaxStretch: 0.4,
    edgeResistance: 3,
    settleDistance: 0.1,
    settleWobble: 0.01,
    labelFadeLerp: 0.25,
  },
  appearance: {
    color: "#1E6DF6",
    trackBackground: "#EDF2FA",
    separatorColor: "#C1D2EF",
    item: {
      selectedOpacity: 1,
      unselectedOpacity: 0.6,
      selectedScale: 1,
      unselectedScale: 1,
    },
  },
};

/** Merges partial overrides onto {@link LIQUID_TOGGLE_DEFAULT_CONFIG}. */
export function resolveLiquidToggleConfig(
  overrides?: LiquidToggleConfigOverrides,
): LiquidToggleConfig {
  const defaults = LIQUID_TOGGLE_DEFAULT_CONFIG;
  return {
    layout: { ...defaults.layout, ...overrides?.layout },
    thumb: { ...defaults.thumb, ...overrides?.thumb },
    glass: {
      ...defaults.glass,
      ...overrides?.glass,
      axisStrength: {
        ...defaults.glass.axisStrength,
        ...overrides?.glass?.axisStrength,
      },
    },
    physics: { ...defaults.physics, ...overrides?.physics },
    appearance: {
      ...defaults.appearance,
      ...overrides?.appearance,
      item: { ...defaults.appearance.item, ...overrides?.appearance?.item },
    },
  };
}
