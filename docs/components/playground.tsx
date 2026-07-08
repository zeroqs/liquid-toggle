"use client";

import type { LiquidToggleConfigOverrides } from "@zeroqs/liquid-toggle";
import { LIQUID_TOGGLE_DEFAULT_CONFIG, LiquidToggle } from "@zeroqs/liquid-toggle";
import { useMemo, useState } from "react";

const DEFAULTS = LIQUID_TOGGLE_DEFAULT_CONFIG;

interface SliderSpec {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  hint: string;
}

const GLASS_SLIDERS: SliderSpec[] = [
  {
    key: "strength",
    label: "strength",
    min: 0,
    max: 20,
    step: 0.5,
    hint: "Max displacement at the rim, px — the master intensity knob",
  },
  {
    key: "bezelWidth",
    label: "bezelWidth",
    min: 2,
    max: 19,
    step: 1,
    hint: "Width of the refracted band along the rim, px",
  },
  {
    key: "cornerBoost",
    label: "cornerBoost",
    min: 1,
    max: 3,
    step: 0.05,
    hint: "Displacement multiplier on the rounded ends (1 = off)",
  },
  {
    key: "cornerSpread",
    label: "cornerSpread",
    min: 0.1,
    max: 1,
    step: 0.05,
    hint: "How far the boost stretches along the arc (lower = longer bend)",
  },
  {
    key: "aberration",
    label: "aberration",
    min: 0,
    max: 0.3,
    step: 0.01,
    hint: "Chromatic aberration spread between R and B samples",
  },
  {
    key: "axisY",
    label: "axisStrength.y",
    min: 0,
    max: 1,
    step: 0.05,
    hint: "Vertical damping of the displacement on the flat top/bottom",
  },
  {
    key: "specularOpacity",
    label: "specularOpacity",
    min: 0,
    max: 1,
    step: 0.05,
    hint: "Rim light opacity along the lens edge",
  },
];

interface PlaygroundState {
  strength: number;
  bezelWidth: number;
  cornerBoost: number;
  cornerSpread: number;
  aberration: number;
  axisY: number;
  specularOpacity: number;
  attraction: number;
  animated: boolean;
  wobble: boolean;
  color: string;
  textColor: string;
  borderColor: string;
  itemWidth: number;
}

const INITIAL: PlaygroundState = {
  strength: DEFAULTS.glass.strength,
  bezelWidth: DEFAULTS.glass.bezelWidth,
  cornerBoost: DEFAULTS.glass.cornerBoost,
  cornerSpread: DEFAULTS.glass.cornerSpread,
  aberration: DEFAULTS.glass.aberration,
  axisY: DEFAULTS.glass.axisStrength.y,
  specularOpacity: DEFAULTS.glass.specularOpacity,
  attraction: DEFAULTS.physics.attraction,
  animated: DEFAULTS.physics.animated,
  wobble: DEFAULTS.physics.wobble,
  color: DEFAULTS.appearance.color,
  textColor: DEFAULTS.appearance.textColor ?? DEFAULTS.appearance.color,
  borderColor: DEFAULTS.appearance.borderColor ?? DEFAULTS.appearance.color,
  itemWidth: 140,
};

/** Interactive demo: every slider maps 1:1 to a `config` key of `<LiquidToggle />`. */
export function Playground() {
  const [state, setState] = useState<PlaygroundState>(INITIAL);
  const [value, setValue] = useState("first");

  const set = <K extends keyof PlaygroundState>(key: K, val: PlaygroundState[K]) =>
    setState((prev) => ({ ...prev, [key]: val }));

  const config = useMemo<LiquidToggleConfigOverrides>(
    () => ({
      glass: {
        strength: state.strength,
        bezelWidth: state.bezelWidth,
        cornerBoost: state.cornerBoost,
        cornerSpread: state.cornerSpread,
        aberration: state.aberration,
        axisStrength: { y: state.axisY },
        specularOpacity: state.specularOpacity,
      },
      physics: { animated: state.animated, wobble: state.wobble, attraction: state.attraction },
      appearance: {
        color: state.color,
        textColor: state.textColor,
        borderColor: state.borderColor,
      },
    }),
    [state],
  );

  const configJson = useMemo(() => JSON.stringify(config, null, 2), [config]);

  return (
    <div className="not-prose flex flex-col gap-6 rounded-xl border p-4">
      <div
        className="flex items-center justify-center rounded-lg py-12"
        style={{
          background: "linear-gradient(135deg, #dbe8ff 0%, #f6f8fc 45%, #e4ecfb 100%)",
        }}
      >
        <LiquidToggle
          value={value}
          onChange={setValue}
          itemWidth={state.itemWidth}
          options={[
            { id: "first", label: "First" },
            { id: "second", label: "Second" },
            { id: "third", label: "Third" },
          ]}
          config={config}
        />
      </div>

      <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
        {GLASS_SLIDERS.map((slider) => (
          <label key={slider.key} className="flex flex-col gap-1 text-sm" title={slider.hint}>
            <span className="flex justify-between font-mono text-xs">
              <span>glass.{slider.label}</span>
              <span className="text-fd-muted-foreground">
                {state[slider.key as keyof PlaygroundState]}
              </span>
            </span>
            <input
              type="range"
              min={slider.min}
              max={slider.max}
              step={slider.step}
              value={state[slider.key as keyof PlaygroundState] as number}
              onChange={(e) =>
                set(slider.key as keyof PlaygroundState, Number(e.target.value) as never)
              }
            />
            <span className="text-xs text-fd-muted-foreground">{slider.hint}</span>
          </label>
        ))}

        <label className="flex flex-col gap-1 text-sm">
          <span className="flex justify-between font-mono text-xs">
            <span>physics.attraction</span>
            <span className="text-fd-muted-foreground">{state.attraction}</span>
          </span>
          <input
            type="range"
            min={0.1}
            max={0.8}
            step={0.05}
            value={state.attraction}
            onChange={(e) => set("attraction", Number(e.target.value))}
          />
          <span className="text-xs text-fd-muted-foreground">
            Fraction of the remaining distance covered per frame
          </span>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="flex justify-between font-mono text-xs">
            <span>itemWidth</span>
            <span className="text-fd-muted-foreground">{state.itemWidth}</span>
          </span>
          <input
            type="range"
            min={100}
            max={200}
            step={10}
            value={state.itemWidth}
            onChange={(e) => set("itemWidth", Number(e.target.value))}
          />
          <span className="text-xs text-fd-muted-foreground">Width of one option cell, px</span>
        </label>

        <label className="flex items-center gap-2 text-sm font-mono">
          <input
            type="checkbox"
            checked={state.animated}
            onChange={(e) => set("animated", e.target.checked)}
          />
          physics.animated
          <span className="text-xs text-fd-muted-foreground font-sans">
            off = the thumb snaps instantly
          </span>
        </label>

        <label className="flex items-center gap-2 text-sm font-mono">
          <input
            type="checkbox"
            checked={state.wobble}
            onChange={(e) => set("wobble", e.target.checked)}
          />
          physics.wobble
          <span className="text-xs text-fd-muted-foreground font-sans">
            squash &amp; stretch while moving
          </span>
        </label>

        <label className="flex items-center gap-2 text-sm font-mono">
          <input type="color" value={state.color} onChange={(e) => set("color", e.target.value)} />
          appearance.color
          <span className="text-xs text-fd-muted-foreground font-sans">thumb ring + fallback</span>
        </label>

        <label className="flex items-center gap-2 text-sm font-mono">
          <input
            type="color"
            value={state.textColor}
            onChange={(e) => set("textColor", e.target.value)}
          />
          appearance.textColor
        </label>

        <label className="flex items-center gap-2 text-sm font-mono">
          <input
            type="color"
            value={state.borderColor}
            onChange={(e) => set("borderColor", e.target.value)}
          />
          appearance.borderColor
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Resulting `config` prop</span>
          <button
            type="button"
            className="rounded-md border px-2 py-1 text-xs hover:bg-fd-accent"
            onClick={() => setState(INITIAL)}
          >
            Reset to defaults
          </button>
        </div>
        <pre className="overflow-x-auto rounded-lg border bg-fd-secondary p-3 text-xs">
          {configJson}
        </pre>
      </div>
    </div>
  );
}
