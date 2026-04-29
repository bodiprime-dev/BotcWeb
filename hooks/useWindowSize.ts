import { useState, useEffect } from "react";

export function useWindowSize() {
  const [size, setSize] = useState({ vw: 800, vh: 600 });
  useEffect(() => {
    const update = () => setSize({ vw: window.innerWidth, vh: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return size;
}
