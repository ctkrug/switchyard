import { describe, expect, it } from "vitest";
import { resolveDestination } from "../src/game/track";
import type { Switch } from "../src/game/types";

const switches: Switch[] = [
  { id: "switch-1", sidingId: "siding-1" },
  { id: "switch-2", sidingId: "siding-2" },
  { id: "switch-3", sidingId: "siding-3" },
];

describe("resolveDestination", () => {
  it("diverts into the first switch thrown right", () => {
    const dest = resolveDestination(switches, { "switch-1": "right" });
    expect(dest).toBe("siding-1");
  });

  it("passes through switches left of the diverting one", () => {
    const dest = resolveDestination(switches, {
      "switch-1": "left",
      "switch-2": "right",
    });
    expect(dest).toBe("siding-2");
  });

  it("stops at the first diverting switch, ignoring later ones", () => {
    const dest = resolveDestination(switches, {
      "switch-1": "right",
      "switch-2": "right",
    });
    expect(dest).toBe("siding-1");
  });

  it("returns null when every switch is left (overruns the bump post)", () => {
    const dest = resolveDestination(switches, {});
    expect(dest).toBeNull();
  });

  it("returns null for an empty switch chain", () => {
    expect(resolveDestination([], {})).toBeNull();
  });

  it("treats a switch missing from state as left", () => {
    const dest = resolveDestination(switches, { "switch-2": "right" });
    expect(dest).toBe("siding-2");
  });
});
