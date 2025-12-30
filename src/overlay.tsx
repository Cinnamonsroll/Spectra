import { useState, useCallback, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { usePixelPicker, type LoupeData } from "./hooks/usePixelPicker";
import Loupe from "./components/Loupe";
import ColorResult from "./components/ColorResult";
import { hexToRgb } from "./utils/colorUtils";

interface OverlayProps {
  show: boolean;
  onClose: () => void;
}

export default function Overlay({
  show,
  onClose,
}: OverlayProps) {
  const [picking, setPicking] = useState(true);
  const [frozenData, setFrozenData] = useState<LoupeData | null>(null);
  const [referenceColor, setReferenceColor] = useState<{
    r: number;
    g: number;
    b: number;
    hex: string;
  } | null>(null);
  const closingRef = useRef(false);

  const pixelData = usePixelPicker(picking);

  const pixelDataRef = useRef(pixelData);
  const pickingRef = useRef(picking);

  useEffect(() => {
    pixelDataRef.current = pixelData;
  }, [pixelData]);
  useEffect(() => {
    pickingRef.current = picking;
  }, [picking]);

  useEffect(() => {
    if (show) {
      closingRef.current = false;
      setPicking(true);
    } else {
      setPicking(false);
      setFrozenData(null);
      invoke("stop_picking").catch(() => {});
    }

    return () => {
      invoke("stop_picking").catch(() => {});
    };
  }, [show]);

  const handleClick = useCallback(() => {
    if (picking && pixelData) {
      setPicking(false);
      setFrozenData(pixelData);
    }
  }, [picking, pixelData]);

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (!closingRef.current) {
          closingRef.current = true;
          setPicking(false);
          setFrozenData(null);
          invoke("stop_picking").catch(() => {});
          onClose();
        }
      }

      if (pickingRef.current) {
        let dx = 0;
        let dy = 0;
        if (e.key === "ArrowUp") dy = -1;
        if (e.key === "ArrowDown") dy = 1;
        if (e.key === "ArrowLeft") dx = -1;
        if (e.key === "ArrowRight") dx = 1;

        if (dx !== 0 || dy !== 0) {
          e.preventDefault();
          invoke("move_cursor", { dx, dy });
        }

        if (e.key === "Enter" && pixelDataRef.current) {
          e.preventDefault();
          setPicking(false);
          setFrozenData(pixelDataRef.current);
        }
      }
    };
    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, [onClose]);

  const handleClose = useCallback(() => {
    if (!closingRef.current) {
      closingRef.current = true;
      setPicking(false);
      setFrozenData(null);
      invoke("stop_picking").catch(() => {});
      onClose();
    }
  }, [onClose]);

  const handlePickAgain = useCallback(() => {
    setPicking(true);
    setFrozenData(null);
  }, []);

  const handleSetReference = useCallback(
    (color: { r: number; g: number; b: number; hex: string }) => {
      setReferenceColor(color);
      handlePickAgain();
    },
    [handlePickAgain]
  );

  const handleClearReference = useCallback(() => {
    setReferenceColor(null);
  }, []);

  const handleSelectHistoryColor = useCallback((hex: string) => {
    const rgb = hexToRgb(hex);
    if (rgb) {
      setFrozenData({
        r: rgb.r,
        g: rgb.g,
        b: rgb.b,
        x: 0,
        y: 0,
        grid: [],
        grid_width: 0,
        grid_height: 0,
        hex: hex,
      });
    }
  }, []);

  return (
    <div
      onClick={picking ? handleClick : undefined}
      style={{
        position: "fixed",
        inset: 0,
        cursor: picking ? "crosshair" : "default",
        zIndex: 9999,
        backgroundColor: "transparent",
        display: show ? "block" : "none",
      }}
    >
      {picking && pixelData && (
        <Loupe
          data={pixelData}
          mouseX={pixelData.x / window.devicePixelRatio}
          mouseY={pixelData.y / window.devicePixelRatio}
        />
      )}

      {!picking && frozenData && (
        <ColorResult
          color={frozenData.hex}
          rgb={{ r: frozenData.r, g: frozenData.g, b: frozenData.b }}
          referenceColor={referenceColor}
          onClose={handleClose}
          onPickAgain={handlePickAgain}
          onSetReference={handleSetReference}
          onClearReference={handleClearReference}
          onSelectHistoryColor={handleSelectHistoryColor}
        />
      )}
    </div>
  );
}
