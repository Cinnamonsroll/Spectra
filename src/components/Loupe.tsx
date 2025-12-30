import { memo } from "react";
import type { LoupeData } from "../hooks/usePixelPicker";

interface LoupeProps {
  data: LoupeData;
  mouseX: number;
  mouseY: number;
}

function Loupe({ data, mouseX, mouseY }: LoupeProps) {
  const ZOOM = 12;
  const width = data.grid_width * ZOOM;
  const height = data.grid_height * ZOOM;

  const offset = 25;
  let left = mouseX + offset;
  let top = mouseY - height / 2;

  const infoHeight = 50;

  if (left + width > window.innerWidth) {
    left = mouseX - width - offset;
  }

  if (top < 0) {
    top = 10;
  }

  if (top + height + infoHeight > window.innerHeight) {
    top = window.innerHeight - height - infoHeight - 10;
  }

  const pixels = [];
  const totalPixels = data.grid_width * data.grid_height;

  if (data.grid && data.grid.length >= totalPixels * 3) {
    for (let i = 0; i < totalPixels; i++) {
      const r = data.grid[i * 3];
      const g = data.grid[i * 3 + 1];
      const b = data.grid[i * 3 + 2];
      pixels.push(
        <div
          key={i}
          style={{
            width: "100%",
            height: "100%",
            backgroundColor: `rgb(${r},${g},${b})`,
          }}
        />
      );
    }
  }

  return (
    <>
      <div
        style={{
          position: "fixed",
          left,
          top,
          zIndex: 999999,
          display: "flex",
          flexDirection: "column",
          boxShadow:
            "0 0 0 1px rgba(255,255,255,0.1), 0 8px 24px rgba(0,0,0,0.5)",
          borderRadius: "8px",
          overflow: "hidden",
          backgroundColor: "#121212",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace",
        }}
      >
        <div
          style={{
            position: "relative",
            width: width,
            height: height,
            display: "grid",
            gridTemplateColumns: `repeat(${data.grid_width}, 1fr)`,
            gridTemplateRows: `repeat(${data.grid_height}, 1fr)`,
            cursor: "none",
            background: "#000",
          }}
        >
          {pixels}

          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              width: ZOOM,
              height: ZOOM,
              border: "1px solid rgba(255,255,255,0.9)",
              boxShadow: "0 0 0 1px rgba(0,0,0,0.8)",
              zIndex: 10,
              pointerEvents: "none",
            }}
          />
        </div>

        <div
          style={{
            padding: "4px 6px",
            background: "#121212",
            borderTop: "1px solid rgba(255,255,255,0.1)",
            display: "flex",
            flexDirection: "column",
            gap: "0px",
            color: "#fff",
            fontSize: "9px",
            lineHeight: "1.2",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{ color: "#888" }}>HEX</span>
            <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "2px",
                  background: data.hex,
                  border: "1px solid rgba(255,255,255,0.3)",
                }}
              />
              <span
                style={{
                  fontWeight: 500,
                  fontFamily: "monospace",
                  color: "#4cc2ff",
                }}
              >
                {data.hex}
              </span>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{ color: "#888" }}>XY</span>
            <span style={{ fontWeight: 500, fontFamily: "monospace" }}>
              {data.x}, {data.y}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

export default memo(Loupe);
