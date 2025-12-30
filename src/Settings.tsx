import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

export default function Settings() {
  const [shortcut, setShortcut] = useState("Ctrl+.");
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const savedShortcut = localStorage.getItem("spectra-shortcut");
    if (savedShortcut) setShortcut(savedShortcut);
  }, []);

  useEffect(() => {
    if (!recording) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.key === "Escape") {
        setRecording(false);
        return;
      }

      const modifiers = [];
      if (e.ctrlKey) modifiers.push("Ctrl");
      if (e.altKey) modifiers.push("Alt");
      if (e.shiftKey) modifiers.push("Shift");
      if (e.metaKey) modifiers.push("Super");

      let key = e.key.toUpperCase();
      if (["CONTROL", "ALT", "SHIFT", "META"].includes(key)) return;

      if (key === " ") key = "Space";
      else if (key.length === 1) key = key.toUpperCase();

      const newShortcut = [...modifiers, key].join("+");

      handleSaveShortcut(newShortcut);
      setRecording(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [recording]);

  const handleSaveShortcut = async (newShortcut: string) => {
    try {
      await invoke("register_shortcut", { shortcut: newShortcut });
      setShortcut(newShortcut);
      localStorage.setItem("spectra-shortcut", newShortcut);
      setError(null);
    } catch (err) {
      console.error("Failed to register shortcut:", err);
      setError("Failed to register shortcut. Try another combination.");
    }
  };

  return (
    <div
      style={{
        padding: "32px",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        color: "#e0e0e0",
        background: "#090909",
        minHeight: "100vh",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: "32px",
      }}
    >
      <style>{`
        .settings-card {
            background: #141414;
            border: 1px solid #222;
            border-radius: 12px;
            padding: 20px;
            transition: border-color 0.2s;
        }
        .settings-card:hover {
            border-color: #333;
        }
        .keybind-recorder {
            background: #1e1f22;
            border: 1px solid #1e1f22;
            border-radius: 4px;
            padding: 8px 12px;
            min-width: 140px;
            color: #dbdee1;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 14px;
            cursor: pointer;
            text-align: center;
            transition: all 0.2s;
            user-select: none;
            display: inline-block;
        }
        .keybind-recorder:hover {
            border-color: #4e5058;
            background: #2b2d31;
        }
        .keybind-recorder.recording {
            color: #fff;
            background: #1e1f22;
            border-color: #3ba55c;
            box-shadow: 0 0 0 2px rgba(59, 165, 92, 0.3);
        }
      `}</style>

      <div style={{ paddingBottom: "16px", borderBottom: "1px solid #222" }}>
        <h2
          style={{
            margin: 0,
            fontSize: "28px",
            fontWeight: 700,
            letterSpacing: "-0.5px",
          }}
        >
          Settings
        </h2>
        <p style={{ margin: "8px 0 0", color: "#666", fontSize: "14px" }}>
          Configure how Spectra works for you
        </p>
        {error && (
          <div style={{ color: "#ff4d4d", marginTop: "8px", fontSize: "14px" }}>
            {error}
          </div>
        )}
      </div>

      <div className="settings-card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <label
              style={{
                display: "block",
                fontSize: "16px",
                fontWeight: 600,
                color: "#fff",
                marginBottom: "4px",
              }}
            >
              Activation Shortcut
            </label>
            <div style={{ fontSize: "13px", color: "#888", lineHeight: "1.5" }}>
              Toggle the color picker from anywhere
            </div>
          </div>

          <div
            className={`keybind-recorder ${recording ? "recording" : ""}`}
            onClick={() => setRecording(true)}
          >
            {recording ? "Press keys..." : shortcut}
          </div>
        </div>
      </div>
    </div>
  );
}
