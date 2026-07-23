/**
 * Transparent margin around the track inside the texture, CSS px. The lens is
 * larger than the track and samples outside it; without the margin,
 * CLAMP_TO_EDGE would smear the border-colored edge texels into solid bands.
 */
export const TRACK_TEXTURE_PADDING = 24;

/** A loaded, ready-to-draw icon of one option. */
export interface TrackTextureIcon {
  /** Decoded image (must not taint the canvas — see CORS notes in the README). */
  image: CanvasImageSource;
  /** Rendered width, CSS px. */
  width: number;
  /** Rendered height, CSS px. */
  height: number;
  /** Which side of the label the icon sits on. Defaults to `"left"`. */
  position?: "left" | "right";
}

/** Input for {@link drawTrackTexture}. */
export interface TrackTextureOptions {
  /** Track width in CSS px (the backing canvas is `quality`× larger plus padding). */
  width: number;
  /** Track height in CSS px. */
  height: number;
  /** Supersampling factor, must match the renderer's `quality`. */
  quality: number;
  /** Option labels, in order. */
  labels: string[];
  /** Loaded icons aligned with `labels`; `null` = the option has no icon (or it failed to load). */
  icons?: ReadonlyArray<TrackTextureIcon | null>;
  /** Gap between an icon and its label, px. Must match the DOM flex `gap`. */
  iconGap?: number;
  /** Current (animated) opacity per label — must match what the DOM shows. */
  alphas: ArrayLike<number>;
  /** Whether 1px separators are drawn between options. */
  separator: boolean;
  /** Canvas font string mirroring the DOM labels (e.g. `"500 12px Inter"`). */
  font: string;
  /** Track border color. */
  borderColor: string;
  /** Label color. */
  textColor: string;
  /** Track fill color. */
  trackBackground: string;
  /** Separator color. */
  separatorColor: string;
}

/**
 * Draws the same thing the DOM renders under the thumb — pill background,
 * border, separators, labels — into a 2d canvas that the shader then refracts.
 * This is the price of the canvas approach: the backdrop is replicated by hand,
 * which also means it only works because the toggle owns its own opaque track.
 */
export function drawTrackTexture(
  ctx: CanvasRenderingContext2D,
  options: TrackTextureOptions,
): void {
  const { width, height, quality, labels, alphas, separator, font } = options;
  const radius = height / 2;
  const pad = TRACK_TEXTURE_PADDING;

  ctx.save();
  ctx.setTransform(quality, 0, 0, quality, 0, 0);
  ctx.clearRect(0, 0, width + pad * 2, height + pad * 2);
  ctx.translate(pad, pad);

  // Pill background + border (everything outside stays transparent so the
  // shader can let the real page show through)
  ctx.beginPath();
  ctx.roundRect(0.5, 0.5, width - 1, height - 1, radius - 0.5);
  ctx.fillStyle = options.trackBackground;
  ctx.fill();
  ctx.strokeStyle = options.borderColor;
  ctx.lineWidth = 1;
  ctx.stroke();

  const count = labels.length;
  if (count === 0) {
    ctx.restore();
    return;
  }

  const separatorWidth = separator ? 1 : 0;
  const itemWidth = (width - separatorWidth * (count - 1)) / count;

  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (let i = 0; i < count; i++) {
    const left = i * (itemWidth + separatorWidth);

    if (separator && i > 0) {
      ctx.globalAlpha = 1;
      ctx.fillStyle = options.separatorColor;
      ctx.fillRect(left - separatorWidth, (height - 24) / 2, separatorWidth, 24);
    }

    ctx.globalAlpha = alphas[i] ?? 1;
    ctx.fillStyle = options.textColor;
    ctx.save();
    ctx.beginPath();
    ctx.rect(left + 8, 0, itemWidth - 16, height);
    ctx.clip();
    const label = labels[i] ?? "";
    const icon = options.icons?.[i] ?? null;
    if (icon) {
      // Center the icon + gap + label group, mirroring the DOM flex layout
      const gap = options.iconGap ?? 0;
      const textWidth = ctx.measureText(label).width;
      const groupLeft = left + (itemWidth - icon.width - gap - textWidth) / 2;
      const iconLeft = icon.position === "right" ? groupLeft + textWidth + gap : groupLeft;
      const textLeft = icon.position === "right" ? groupLeft : groupLeft + icon.width + gap;
      ctx.drawImage(icon.image, iconLeft, (height - icon.height) / 2, icon.width, icon.height);
      ctx.textAlign = "left";
      ctx.fillText(label, textLeft, height / 2 + 0.5);
    } else {
      ctx.fillText(label, left + itemWidth / 2, height / 2 + 0.5);
    }
    ctx.restore();
  }

  ctx.restore();
}
