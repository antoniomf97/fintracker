import "@testing-library/jest-dom/vitest";

// jsdom doesn't implement ResizeObserver, which Recharts relies on.
class ResizeObserverStub implements ResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

globalThis.ResizeObserver ??= ResizeObserverStub;

// jsdom doesn't implement matchMedia, which the theme hook uses to read the OS
// color-scheme preference. Default to light; tests can override per-case.
globalThis.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addEventListener: () => {},
  removeEventListener: () => {},
  addListener: () => {},
  removeListener: () => {},
  dispatchEvent: () => false,
})) as unknown as typeof matchMedia;
