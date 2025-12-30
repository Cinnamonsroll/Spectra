import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export interface LoupeData {
  r: number;
  g: number;
  b: number;
  x: number;
  y: number;
  grid: number[];
  grid_width: number;
  grid_height: number;
  hex: string;
}

export function usePixelPicker(active: boolean) {
  const [data, setData] = useState<LoupeData | null>(null);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    if (active) {
      invoke("start_picking").catch(console.error);

      listen<Omit<LoupeData, "hex">>("loupe-update", (event) => {
        const { r, g, b, x, y, grid, grid_width, grid_height } = event.payload;
        const hex =
          "#" +
          ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
        setData({ r, g, b, x, y, grid, grid_width, grid_height, hex });
      }).then((f) => {
        unlisten = f;
      });
    } else {
      invoke("stop_picking").catch(console.error);
    }

    return () => {
      if (unlisten) unlisten();
      invoke("stop_picking").catch(console.error);
    };
  }, [active]);

  return data;
}
