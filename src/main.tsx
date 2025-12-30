import { createRoot } from "react-dom/client";
import { getCurrentWindow } from "@tauri-apps/api/window";
import "./styles.css";
import App from "./App.tsx";
import Settings from "./Settings.tsx";

const win = getCurrentWindow();
const label = win.label;

createRoot(document.getElementById("root")!).render(
  label === "settings" ? <Settings /> : <App />
);
