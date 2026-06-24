import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useIsMobile } from "./useIsMobile";

describe("useIsMobile", () => {
  it("defaults to desktop (matchMedia stub reports no match)", () => {
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });
});
