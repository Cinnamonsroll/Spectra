import { useState, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import Overlay from "./overlay";

function App() {
  const [showOverlay, setShowOverlay] = useState(false);

  const handleClose = async () => {
    setShowOverlay(false);
    await invoke("hide_window");
  };

  useEffect(() => {
    const saved = localStorage.getItem("spectra-shortcut");
    invoke("register_shortcut", { shortcut: saved || "Ctrl+." }).catch(
      console.error
    );

    const unlistenShortcut = listen("shortcut-triggered", async () => {
      setShowOverlay(true);
      const win = getCurrentWindow();
      await win.setAlwaysOnTop(true);
      await win.show();
      await win.setFocus();
    });

    return () => {
      unlistenShortcut.then((f) => f());
    };
  }, []);

  return showOverlay ? (
    <Overlay show={true} onClose={handleClose} />
  ) : null;
}

export default App;
