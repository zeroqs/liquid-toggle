"use client";

import { LiquidToggle } from "@zeroqs/liquid-toggle";
import { useState } from "react";

/**
 * Mirrors real-world usage: icons are plain SVG files served by URL, drawn
 * with `currentColor` — the `color` tint keeps them in the theme color.
 */
const OPTIONS = [
  {
    id: "objects",
    label: "Trade objects",
    icon: { src: "/icons/trade-object.svg", color: "#1E6DF6" },
  },
  {
    id: "points",
    label: "Trade points",
    icon: { src: "/icons/trade-point.svg", color: "#1E6DF6", position: "right" as const },
  },
];

export function IconsDemo() {
  const [value, setValue] = useState("objects");

  return (
    <div
      id="icons-demo"
      className="not-prose flex items-center justify-center rounded-xl border py-10"
      style={{
        background: "linear-gradient(135deg, #dbe8ff 0%, #f6f8fc 45%, #e4ecfb 100%)",
      }}
    >
      <LiquidToggle value={value} onChange={setValue} itemWidth={150} options={OPTIONS} />
    </div>
  );
}
