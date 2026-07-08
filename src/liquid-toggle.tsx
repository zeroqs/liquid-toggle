import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { LiquidToggleConfig, LiquidToggleConfigOverrides } from "./config.ts";
import { resolveLiquidToggleConfig } from "./config.ts";
import { GlassRenderer } from "./glass-renderer.ts";
import { drawTrackTexture, TRACK_TEXTURE_PADDING } from "./track-texture.ts";

/** A single option of the toggle. */
export interface LiquidToggleOption {
  /** Unique id, reported through `onChange`. */
  id: string;
  /**
   * Label text. Must be a plain string: the lens draws its own canvas copy of
   * the label, and arbitrary React nodes cannot be replicated on a canvas.
   */
  label: string;
}

/** Props of {@link LiquidToggle}. */
export interface LiquidToggleProps {
  /** Currently selected option id (controlled). `null`/unknown id hides the thumb. */
  value?: string | null;
  /** Called with the option id when the selection changes (click or drag). */
  onChange?: (value: string) => void;
  /** Options, in display order. */
  options: LiquidToggleOption[];
  /** Width of one option cell, px. Defaults to `config.layout.itemWidth`. */
  itemWidth?: number;
  /** Draw 1px separators between options. */
  separator?: boolean;
  /** Partial config overrides, merged onto {@link LIQUID_TOGGLE_DEFAULT_CONFIG}. */
  config?: LiquidToggleConfigOverrides;
  /** Extra class for the root element. */
  className?: string;
  /** Extra inline styles for the root element. */
  style?: CSSProperties;
}

function lerp(start: number, end: number, t: number): number {
  return start * (1 - t) + end * t;
}

const LABEL_DATA_ATTR = "data-liquid-toggle-label";

/**
 * A liquid-glass segmented toggle. The sliding thumb is a WebGL lens over a
 * hand-drawn canvas copy of the track, so the refraction runs entirely on the
 * GPU — no `backdrop-filter`, no SVG filters, works in every browser with WebGL.
 */
export function LiquidToggle({
  value,
  onChange,
  options,
  itemWidth: itemWidthProp,
  separator = false,
  config: configOverrides,
  className,
  style,
}: LiquidToggleProps): ReactNode {
  const config = useMemo(() => resolveLiquidToggleConfig(configOverrides), [configOverrides]);

  const itemWidth = itemWidthProp ?? config.layout.itemWidth;
  const thumbWidth = itemWidth - 4;
  const thumbHeight = config.thumb.height;
  const centerOffset = (itemWidth - thumbWidth) / 2;
  const sliderWidth = itemWidth * options.length;
  const trackHeight = config.layout.height;

  const [internalValue, setInternalValue] = useState<string | undefined>(value ?? undefined);
  const [glassFailed, setGlassFailed] = useState(false);

  useEffect(() => {
    setInternalValue(value ?? undefined);
  }, [value]);

  const selectedIndex = useMemo(
    () => options.findIndex((item) => item.id === internalValue),
    [options, internalValue],
  );

  const optionsKey = useMemo(() => options.map((item) => item.id).join("|"), [options]);

  // --- Animation state lives in refs and is flushed straight to the DOM /
  // WebGL, no setState per frame → no React re-renders while the thumb moves
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const positionRef = useRef(0);
  const targetRef = useRef(0);
  const wobbleXRef = useRef(1);
  const wobbleYRef = useRef(1);
  const frameRef = useRef<number | null>(null);
  const draggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartPositionRef = useRef(0);

  // Canvas glass state
  const rendererRef = useRef<GlassRenderer | null>(null);
  const textureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const labelFontRef = useRef("500 12px sans-serif");
  const labelAlphasRef = useRef<Float32Array>(new Float32Array(0));
  const textureDirtyRef = useRef(true);

  const applyTransform = useCallback(() => {
    const el = thumbRef.current;
    if (!el) return;
    const scaleX = config.thumb.scale * wobbleXRef.current;
    const scaleY = config.thumb.scale * config.thumb.scaleY * wobbleYRef.current;
    el.style.transform = `translate3d(${positionRef.current}px, -50%, 0) scale(${scaleX}, ${scaleY})`;
  }, [config]);

  // Redraws the track texture (if labels faded) and the lens itself
  const drawGlassRef = useRef<(() => void) | undefined>(undefined);
  drawGlassRef.current = () => {
    const renderer = rendererRef.current;
    if (!renderer) return;

    if (textureDirtyRef.current) {
      const textureCanvas = textureCanvasRef.current;
      const ctx = textureCanvas?.getContext("2d");
      if (textureCanvas && ctx) {
        drawTrackTexture(ctx, {
          width: sliderWidth,
          height: trackHeight,
          quality: config.glass.quality,
          labels: options.map((item) => item.label),
          alphas: labelAlphasRef.current,
          separator,
          font: labelFontRef.current,
          borderColor: config.appearance.borderColor ?? config.appearance.color,
          textColor: config.appearance.textColor ?? config.appearance.color,
          trackBackground: config.appearance.trackBackground,
          separatorColor: config.appearance.separatorColor,
        });
        renderer.uploadTexture(textureCanvas);
      }
      textureDirtyRef.current = false;
    }

    renderer.render(
      TRACK_TEXTURE_PADDING + positionRef.current + thumbWidth / 2,
      TRACK_TEXTURE_PADDING + trackHeight / 2,
    );
  };

  const stepRef = useRef<(() => void) | undefined>(undefined);
  stepRef.current = () => {
    const { physics } = config;

    const dest = targetRef.current;
    const prev = positionRef.current;
    const diff = dest - prev;
    const velocity = diff * physics.attraction;

    positionRef.current = prev + velocity;

    if (physics.wobble) {
      // Squash & stretch from current speed
      const speed = Math.abs(velocity);
      const stretch = 1 + Math.min(speed * physics.stretchPerSpeed, physics.maxStretch);
      wobbleXRef.current = lerp(wobbleXRef.current, stretch, physics.wobbleLerp);
      wobbleYRef.current = lerp(wobbleYRef.current, 1 / stretch, physics.wobbleLerp);
    }

    // Converge the canvas copies of the labels to the same opacity the DOM
    // transition is animating towards
    const alphas = labelAlphasRef.current;
    let alphasSettled = true;
    options.forEach((item, i) => {
      const target =
        item.id === internalValue
          ? config.appearance.item.selectedOpacity
          : config.appearance.item.unselectedOpacity;
      const next = lerp(alphas[i] ?? target, target, physics.labelFadeLerp);
      if (Math.abs(next - target) > 0.005) {
        alphas[i] = next;
        alphasSettled = false;
        textureDirtyRef.current = true;
      } else if (alphas[i] !== target) {
        alphas[i] = target;
        textureDirtyRef.current = true;
      }
    });

    const isSettled =
      Math.abs(diff) < physics.settleDistance &&
      Math.abs(wobbleXRef.current - 1) < physics.settleWobble &&
      alphasSettled;

    if (isSettled) {
      positionRef.current = dest;
      wobbleXRef.current = 1;
      wobbleYRef.current = 1;
      applyTransform();
      drawGlassRef.current?.();
      frameRef.current = null;
      return;
    }

    applyTransform();
    drawGlassRef.current?.();
    frameRef.current = requestAnimationFrame(() => stepRef.current?.());
  };

  const startAnimation = useCallback(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => stepRef.current?.());
  }, []);

  const stopAnimation = useCallback(() => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }, []);

  // Place the thumb before the first paint
  useLayoutEffect(() => {
    const index = options.findIndex((item) => item.id === internalValue);
    positionRef.current = index === -1 ? centerOffset : index * itemWidth + centerOffset;
    targetRef.current = positionRef.current;
    applyTransform();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // (Re)create the WebGL lens when the geometry changes
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const labelEl = trackRef.current?.querySelector(`[${LABEL_DATA_ATTR}]`);
    if (labelEl) {
      const labelStyle = getComputedStyle(labelEl);
      labelFontRef.current = `${labelStyle.fontWeight} ${labelStyle.fontSize} ${labelStyle.fontFamily}`;
    }

    labelAlphasRef.current = new Float32Array(
      options.map((item) =>
        item.id === internalValue
          ? config.appearance.item.selectedOpacity
          : config.appearance.item.unselectedOpacity,
      ),
    );

    const textureCanvas = document.createElement("canvas");
    textureCanvas.width = Math.max(
      1,
      Math.round((sliderWidth + TRACK_TEXTURE_PADDING * 2) * config.glass.quality),
    );
    textureCanvas.height = Math.max(
      1,
      Math.round((trackHeight + TRACK_TEXTURE_PADDING * 2) * config.glass.quality),
    );
    textureCanvasRef.current = textureCanvas;

    const renderer = new GlassRenderer({
      canvas,
      lensWidth: thumbWidth * config.thumb.scale,
      lensHeight: thumbHeight * config.thumb.scale * config.thumb.scaleY,
      quality: config.glass.quality,
      trackWidth: sliderWidth + TRACK_TEXTURE_PADDING * 2,
      trackHeight: trackHeight + TRACK_TEXTURE_PADDING * 2,
      bezelWidth: config.glass.bezelWidth,
      strength: config.glass.strength,
      axisStrength: config.glass.axisStrength,
      cornerBoost: config.glass.cornerBoost,
      cornerSpread: config.glass.cornerSpread,
      aberration: config.glass.aberration,
      specularOpacity: config.glass.specularOpacity,
      lightAngle: config.glass.lightAngle,
    });

    rendererRef.current = renderer.ok ? renderer : null;
    setGlassFailed(!renderer.ok);

    textureDirtyRef.current = true;
    drawGlassRef.current?.();

    return () => {
      renderer.dispose();
      rendererRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optionsKey, sliderWidth, thumbWidth, thumbHeight, trackHeight, config]);

  useEffect(() => {
    if (selectedIndex === -1) return;
    targetRef.current = selectedIndex * itemWidth + centerOffset;
    if (!draggingRef.current) startAnimation();
  }, [selectedIndex, itemWidth, centerOffset, startAnimation]);

  useEffect(() => stopAnimation, [stopAnimation]);

  // --- Drag (pointer events + capture cover mouse and touch at once)
  const handleThumbPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      draggingRef.current = true;
      dragStartXRef.current = e.clientX;
      dragStartPositionRef.current = positionRef.current;
      stopAnimation();
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [stopAnimation],
  );

  const handleThumbPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return;

      const { physics } = config;
      const delta = e.clientX - dragStartXRef.current;
      let next = dragStartPositionRef.current + delta;

      // Damping past the edges
      const minPos = centerOffset;
      const maxPos = sliderWidth - thumbWidth - centerOffset;
      if (next < minPos) next = minPos - (minPos - next) / physics.edgeResistance;
      if (next > maxPos) next = maxPos + (next - maxPos) / physics.edgeResistance;

      if (physics.wobble) {
        const velocity = next - positionRef.current;
        const stretch =
          1 + Math.min(Math.abs(velocity) * physics.dragStretchPerSpeed, physics.dragMaxStretch);
        wobbleXRef.current = lerp(wobbleXRef.current, stretch, physics.wobbleLerp);
        wobbleYRef.current = lerp(wobbleYRef.current, 1 / stretch, physics.wobbleLerp);
      }

      positionRef.current = next;
      applyTransform();
      drawGlassRef.current?.();
    },
    [config, centerOffset, sliderWidth, thumbWidth, applyTransform],
  );

  const handleThumbPointerUp = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;

    const thumbCenter = positionRef.current + thumbWidth / 2;
    const index = Math.max(0, Math.min(Math.floor(thumbCenter / itemWidth), options.length - 1));

    const item = options[index];
    if (item && item.id !== internalValue) {
      setInternalValue(item.id);
      onChange?.(item.id);
    }

    // Snap back even if the value did not change
    targetRef.current = index * itemWidth + centerOffset;
    startAnimation();
  }, [thumbWidth, itemWidth, centerOffset, options, internalValue, onChange, startAnimation]);

  const handleItemClick = useCallback(
    (item: LiquidToggleOption) => {
      if (internalValue !== item.id) {
        setInternalValue(item.id);
        onChange?.(item.id);
      }
    },
    [internalValue, onChange],
  );

  const { appearance } = config;
  const textColor = appearance.textColor ?? appearance.color;
  const borderColor = appearance.borderColor ?? appearance.color;
  const trackRadius = trackHeight / 2;

  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: "fit-content",
        display: "inline-block",
        userSelect: "none",
        touchAction: "none",
        borderRadius: trackRadius,
        isolation: "isolate",
        ...style,
      }}
    >
      <div ref={trackRef} style={{ position: "relative", width: sliderWidth, height: trackHeight }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: appearance.trackBackground,
            borderRadius: trackRadius,
            border: `1px solid ${borderColor}`,
          }}
        />

        <div style={{ position: "absolute", inset: 0, display: "flex", zIndex: 30 }}>
          {options.map((item) => (
            <div
              key={item.id}
              style={{ flex: 1, height: "100%", cursor: "pointer" }}
              onPointerDown={() => handleItemClick(item)}
            />
          ))}
        </div>

        <div
          ref={thumbRef}
          style={{
            position: "absolute",
            top: "50%",
            left: 0,
            zIndex: 40,
            width: thumbWidth,
            height: thumbHeight,
            cursor: "grab",
            // transform is written imperatively every animation frame — a CSS
            // transition on it would fight the rAF loop
            transition: "opacity 150ms ease",
            willChange: "transform",
            opacity: selectedIndex === -1 ? 0 : 1,
            pointerEvents: selectedIndex === -1 ? "none" : "auto",
          }}
          onPointerDown={handleThumbPointerDown}
          onPointerMove={handleThumbPointerMove}
          onPointerUp={handleThumbPointerUp}
          onPointerCancel={handleThumbPointerUp}
        >
          {glassFailed ? (
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: config.thumb.radius,
                backgroundColor: "rgba(255, 255, 255, 0.35)",
                boxShadow: "inset 1px 1px 2px rgba(255, 255, 255, 0.7)",
              }}
            />
          ) : (
            <canvas
              ref={canvasRef}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none",
              }}
            />
          )}
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: config.thumb.radius,
              padding: 1,
              background: `radial-gradient(ellipse 100% 80% at center, transparent 0%, transparent 40%, ${appearance.color} 50%, transparent 60%, transparent 100%)`,
              WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
              WebkitMaskComposite: "xor",
              maskComposite: "exclude",
              pointerEvents: "none",
              zIndex: 10,
            }}
          />
        </div>

        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            pointerEvents: "none",
          }}
        >
          {options.map((option, index) => {
            const isSelected = internalValue === option.id;
            return (
              <Fragment key={option.id}>
                {separator && index > 0 && (
                  <div
                    style={{
                      width: 1,
                      height: 24,
                      borderRadius: 99,
                      background: appearance.separatorColor,
                      flexShrink: 0,
                    }}
                  />
                )}
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 8px",
                    height: "100%",
                    overflow: "hidden",
                    opacity: isSelected
                      ? appearance.item.selectedOpacity
                      : appearance.item.unselectedOpacity,
                    transform: `scale(${
                      isSelected ? appearance.item.selectedScale : appearance.item.unselectedScale
                    })`,
                    transition: "opacity 0.15s, transform 0.15s",
                  }}
                >
                  <span
                    {...{ [LABEL_DATA_ATTR]: true }}
                    style={{
                      fontWeight: 500,
                      color: textColor,
                      fontSize: config.layout.fontSize,
                      lineHeight: 1,
                      textAlign: "center",
                      minWidth: 0,
                      overflow: "hidden",
                    }}
                  >
                    {option.label}
                  </span>
                </div>
              </Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export type { LiquidToggleConfig };
