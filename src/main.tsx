import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Register push notification service worker alongside VitePWA's SW
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/push-sw.js").catch(() => {});
  });
}

createRoot(document.getElementById("root")!).render(<App />);
