import { useEffect, useState } from "react";

// Same 640px breakpoint the CSS uses for its mobile layout. Drives the few
// places that need conditional rendering (not just styling): the reduced range
// pills, the breakdown details toggle, and tap-to-edit rows.
const QUERY = "(max-width: 640px)";

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(
    () => window.matchMedia(QUERY).matches,
  );

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  return isMobile;
}
