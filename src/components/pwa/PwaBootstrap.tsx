import { useEffect } from "react";

/** Register the app-shell worker in production only — never during `vite dev`. */
export function PwaBootstrap() {
  useEffect(() => {
    if (!import.meta.env.PROD) return;
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/sw.js", { scope: "/" });
  }, []);
  return null;
}
