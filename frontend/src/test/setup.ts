import "@testing-library/jest-dom/vitest";

// jsdom doesn't implement ResizeObserver, which Recharts relies on.
class ResizeObserverStub implements ResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

globalThis.ResizeObserver ??= ResizeObserverStub;
