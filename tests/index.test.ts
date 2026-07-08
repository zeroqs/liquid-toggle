import { expect, test } from "vite-plus/test";
import { LIQUID_TOGGLE_DEFAULT_CONFIG, resolveLiquidToggleConfig } from "../src/index.ts";

test("resolveLiquidToggleConfig returns defaults when called without overrides", () => {
  expect(resolveLiquidToggleConfig()).toEqual(LIQUID_TOGGLE_DEFAULT_CONFIG);
});

test("resolveLiquidToggleConfig merges partial overrides deeply", () => {
  const config = resolveLiquidToggleConfig({
    glass: { strength: 12, axisStrength: { y: 0.5 } },
    appearance: { color: "#FF0000", item: { unselectedOpacity: 0.4 } },
  });

  expect(config.glass.strength).toBe(12);
  expect(config.glass.axisStrength).toEqual({ x: 1, y: 0.5 });
  // untouched values keep their defaults
  expect(config.glass.bezelWidth).toBe(LIQUID_TOGGLE_DEFAULT_CONFIG.glass.bezelWidth);
  expect(config.appearance.color).toBe("#FF0000");
  expect(config.appearance.item.unselectedOpacity).toBe(0.4);
  expect(config.appearance.item.selectedOpacity).toBe(
    LIQUID_TOGGLE_DEFAULT_CONFIG.appearance.item.selectedOpacity,
  );
  expect(config.physics).toEqual(LIQUID_TOGGLE_DEFAULT_CONFIG.physics);
});

test("textColor and borderColor are unset by default and accept overrides", () => {
  expect(LIQUID_TOGGLE_DEFAULT_CONFIG.appearance.textColor).toBeUndefined();
  expect(LIQUID_TOGGLE_DEFAULT_CONFIG.appearance.borderColor).toBeUndefined();

  const config = resolveLiquidToggleConfig({
    appearance: { textColor: "#111111", borderColor: "#222222" },
  });

  expect(config.appearance.textColor).toBe("#111111");
  expect(config.appearance.borderColor).toBe("#222222");
  expect(config.appearance.color).toBe(LIQUID_TOGGLE_DEFAULT_CONFIG.appearance.color);
});
