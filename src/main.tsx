import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Apply saved theme before first paint
const savedTheme = localStorage.getItem("theme");
if (savedTheme === "dark") {
  document.documentElement.classList.add("dark");
}

// The push-notification handlers live inside the VitePWA-generated service
// worker (see vite.config.ts workbox.importScripts) and register themselves
// automatically — no separate registration needed here.

createRoot(document.getElementById("root")!).render(<App />);
