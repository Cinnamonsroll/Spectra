import { memo, useEffect, useState, useRef } from "react";
import {
  rgbToHsl,
  rgbToCmyk,
  rgbToHex,
  deltaE,
  deltaE2000,
  simulateColorBlindness,
  getHarmonies,
  getColorVariants,
  getLuminance,
  type ColorBlindnessType,
} from "../utils/colorUtils";

interface ColorResultProps {
  color: string;
  rgb: { r: number; g: number; b: number };
  referenceColor: { r: number; g: number; b: number; hex: string } | null;
  onClose: () => void;
  onPickAgain: () => void;
  onSetReference: (color: {
    r: number;
    g: number;
    b: number;
    hex: string;
  }) => void;
  onClearReference: () => void;
  onSelectHistoryColor: (hex: string) => void;
}

function ColorResult({
  color,
  rgb,
  referenceColor,
  onClose,
  onPickAgain,
  onSetReference,
  onClearReference,
  onSelectHistoryColor,
}: ColorResultProps) {
  const [history, setHistory] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("color-history");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [copied, setCopied] = useState<string | null>(null);
  const closingRef = useRef(false);

  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const startOffset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setOffset({
        x: startOffset.current.x + dx,
        y: startOffset.current.y + dy,
      });
    };

    const handleMouseUp = () => {
      isDragging.current = false;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const handleDragStart = (e: React.MouseEvent) => {
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    startOffset.current = offset;
  };

  const harmonies = getHarmonies(rgb.r, rgb.g, rgb.b);
  const variants = getColorVariants(rgb.r, rgb.g, rgb.b);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const cmyk = rgbToCmyk(rgb.r, rgb.g, rgb.b);
  const hslString = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
  const rgbString = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
  const cmykString = `cmyk(${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%)`;

  const luminance = getLuminance(rgb.r, rgb.g, rgb.b);
  const isDark = luminance < 0.2;
  const glowOpacity = luminance < 0.1 ? 0.2 : 0.1;

  const accentColor = isDark ? "#ffffff" : color;
  const borderColor = isDark ? "rgba(255,255,255,0.2)" : `${color}66`;
  const subtleBg = `${color}15`;

  const textColor = "#ffffff";
  const subTextColor = "rgba(255,255,255,0.6)";

  useEffect(() => {
    setHistory((prev) => {
      if (prev.includes(color)) {
        const newHist = [color, ...prev.filter((c) => c !== color)];
        localStorage.setItem("color-history", JSON.stringify(newHist));
        return newHist;
      }
      const newHist = [color, ...prev].slice(0, 50);
      localStorage.setItem("color-history", JSON.stringify(newHist));
      return newHist;
    });
  }, [color]);

  const copyToClipboard = async (text: string, label: string) => {
    if (closingRef.current) return;
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  };

  const formats = [
    { label: "HEX", value: color, key: "1" },
    { label: "RGB", value: rgbString, key: "2" },
    { label: "HSL", value: hslString, key: "3" },
    { label: "CMYK", value: cmykString, key: "4" },
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (closingRef.current) return;
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      if (e.key.toLowerCase() === "c") {
        if (!referenceColor) onSetReference({ ...rgb, hex: color });
        else onClearReference();
      }
      if (e.key.toLowerCase() === "p" || e.key === " ") {
        e.preventDefault();
        onPickAgain();
      }

      formats.forEach((f) => {
        if (e.key === f.key) copyToClipboard(f.value, f.label);
      });
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    color,
    rgb,
    referenceColor,
    onPickAgain,
    onSetReference,
    onClearReference,
    formats,
  ]);

  const dE76 = referenceColor ? deltaE(referenceColor, rgb) : 0;
  const dE2000 = referenceColor ? deltaE2000(referenceColor, rgb) : 0;

  const simulations: { type: ColorBlindnessType; label: string }[] = [
    { type: "protanopia", label: "Protanopia" },
    { type: "deuteranopia", label: "Deuteranopia" },
    { type: "tritanopia", label: "Tritanopia" },
    { type: "achromatopsia", label: "Achromatopsia" },
  ];

  const renderColorBlock = (
    c: { r: number; g: number; b: number },
    label?: string
  ) => {
    const hex = rgbToHex(c.r, c.g, c.b);
    return (
      <div
        key={hex + label}
        onClick={() => copyToClipboard(hex, label || "Color")}
        title="Click to copy HEX"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          cursor: "pointer",
          alignItems: "center",
          minWidth: "60px",
        }}
      >
        <div
          style={{
            width: "52px",
            height: "52px",
            background: hex,
            borderRadius: "6px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            border: `1px solid ${borderColor}`,
            transition: "transform 0.1s",
          }}
          onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
          onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
        />
        <span
          style={{ fontSize: "10px", color: subTextColor, fontWeight: 500 }}
        >
          {label || hex}
        </span>
      </div>
    );
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10001,
        background: "transparent",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px)`,
          background: "#090909",
          borderRadius: "8px",
          boxShadow: `0 0 0 1px ${borderColor}, 0 20px 60px rgba(0,0,0,0.6), 0 0 150px ${color}${Math.round(
            glowOpacity * 255
          )
            .toString(16)
            .padStart(2, "0")}`,
          display: "flex",
          flexDirection: "column",
          width: "850px",
          maxWidth: "95vw",
          height: "650px",
          maxHeight: "90vh",
          overflow: "hidden",
          color: textColor,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          pointerEvents: "auto",
          animation: "fadeIn 0.2s ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          onMouseDown={handleDragStart}
          style={{
            padding: "20px 32px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: `1px solid ${borderColor}`,
            background: subtleBg,
            cursor: "move",
            userSelect: "none",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                width: "24px",
                height: "24px",
                background: color,
                borderRadius: "6px",
                boxShadow: `0 0 0 1px ${borderColor}`,
              }}
            />
            <h2
              style={{
                margin: 0,
                fontSize: "15px",
                fontWeight: 600,
                letterSpacing: "-0.01em",
                color: accentColor,
              }}
            >
              {referenceColor ? "Comparison Mode" : "Color Inspector"}
            </h2>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={onPickAgain}
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "none",
                color: "#fff",
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 500,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                transition: "background 0.2s",
              }}
              onMouseOver={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.12)")
              }
              onMouseOut={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.08)")
              }
            >
              <span>Pick Again</span>
              <kbd style={{ opacity: 0.5, fontFamily: "inherit" }}>Space</kbd>
            </button>
            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                color: subTextColor,
                cursor: "pointer",
                fontSize: "20px",
                padding: "0 8px",
                display: "flex",
                alignItems: "center",
                transition: "color 0.2s",
              }}
              onMouseOver={(e) => (e.currentTarget.style.color = "#fff")}
              onMouseOut={(e) => (e.currentTarget.style.color = subTextColor)}
            >
              ×
            </button>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flex: 1,
            overflow: "hidden",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "32px 40px",
              paddingBottom: "40px",
            }}
          >
            <div style={{ display: "flex", gap: "32px", marginBottom: "40px" }}>
              {referenceColor && (
                <div
                  style={{
                    flex: 1,
                    background: subtleBg,
                    borderRadius: "16px",
                    padding: "24px",
                    border: `1px solid ${borderColor}`,
                  }}
                >
                  <div
                    style={{
                      fontSize: "12px",
                      color: accentColor,
                      marginBottom: "16px",
                      fontWeight: 600,
                      textTransform: "uppercase",
                    }}
                  >
                    Delta E Difference
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "24px",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: "28px",
                          fontWeight: 700,
                          color: dE76 < 2.3 ? "#4caf50" : "#ff9800",
                        }}
                      >
                        {dE76.toFixed(2)}
                      </div>
                      <div style={{ fontSize: "11px", color: subTextColor }}>
                        CIE76
                      </div>
                    </div>
                    <div
                      style={{
                        width: "1px",
                        height: "40px",
                        background: borderColor,
                      }}
                    />
                    <div>
                      <div
                        style={{
                          fontSize: "28px",
                          fontWeight: 700,
                          color: dE2000 < 2.3 ? "#4caf50" : "#ff9800",
                        }}
                      >
                        {dE2000.toFixed(2)}
                      </div>
                      <div style={{ fontSize: "11px", color: subTextColor }}>
                        CIE2000
                      </div>
                    </div>
                  </div>
                  <div
                    style={{ marginTop: "20px", display: "flex", gap: "12px" }}
                  >
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          height: "8px",
                          borderRadius: "4px",
                          background: referenceColor.hex,
                          marginBottom: "6px",
                        }}
                      />
                      <div
                        style={{
                          fontSize: "11px",
                          color: subTextColor,
                          textAlign: "right",
                        }}
                      >
                        Ref: {referenceColor.hex}
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          height: "8px",
                          borderRadius: "4px",
                          background: color,
                          marginBottom: "6px",
                        }}
                      />
                      <div
                        style={{
                          fontSize: "11px",
                          color: subTextColor,
                          textAlign: "right",
                        }}
                      >
                        Cur: {color}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ flex: referenceColor ? 1 : 2 }}>
                <div
                  style={{
                    fontSize: "12px",
                    color: accentColor,
                    marginBottom: "16px",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                  }}
                >
                  Formats
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  {formats.map((fmt) => (
                    <div
                      key={fmt.label}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        background: subtleBg,
                        padding: "14px 20px",
                        borderRadius: "14px",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        border: `1px solid ${borderColor}`,
                      }}
                      onClick={() => copyToClipboard(fmt.value, fmt.label)}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = `${color}25`;
                        e.currentTarget.style.borderColor = accentColor;
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = subtleBg;
                        e.currentTarget.style.borderColor = borderColor;
                      }}
                    >
                      <span
                        style={{
                          width: "50px",
                          color: subTextColor,
                          fontSize: "11px",
                          fontWeight: 700,
                        }}
                      >
                        {fmt.label}
                      </span>
                      <span
                        style={{
                          flex: 1,
                          fontFamily:
                            "ui-monospace, SFMono-Regular, Menlo, monospace",
                          fontSize: "15px",
                          color: textColor,
                          letterSpacing: "-0.5px",
                        }}
                      >
                        {fmt.value}
                      </span>
                      {copied === fmt.label ? (
                        <span
                          style={{
                            fontSize: "11px",
                            color: "#4caf50",
                            fontWeight: 700,
                            background: "rgba(76, 175, 80, 0.1)",
                            padding: "4px 8px",
                            borderRadius: "10px",
                          }}
                        >
                          Copied
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: "11px",
                            color: subTextColor,
                            opacity: 0.5,
                            border: `1px solid ${borderColor}`,
                            padding: "2px 6px",
                            borderRadius: "4px",
                          }}
                        >
                          {fmt.key}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {!referenceColor && (
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    background: subtleBg,
                    borderRadius: "16px",
                    border: `1px solid ${borderColor}`,
                  }}
                >
                  <div
                    style={{
                      width: "140px",
                      height: "140px",
                      background: color,
                      borderRadius: "50%",
                      boxShadow: `0 0 50px ${color}50, inset 0 0 0 1px rgba(255,255,255,0.2)`,
                    }}
                  />
                  <button
                    onClick={() => onSetReference({ ...rgb, hex: color })}
                    style={{
                      marginTop: "24px",
                      background: "transparent",
                      border: `1px solid ${borderColor}`,
                      color: subTextColor,
                      padding: "8px 16px",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: 500,
                      transition: "all 0.2s",
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = `${color}20`;
                      e.currentTarget.style.color = "#fff";
                      e.currentTarget.style.borderColor = accentColor;
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = subTextColor;
                      e.currentTarget.style.borderColor = borderColor;
                    }}
                  >
                    Set as Reference (C)
                  </button>
                </div>
              )}
            </div>

            <div style={{ marginBottom: "40px" }}>
              <h3
                style={{
                  fontSize: "12px",
                  color: accentColor,
                  marginBottom: "20px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                }}
              >
                Harmonies
              </h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
                  gap: "20px",
                }}
              >
                <div
                  style={{
                    background: subtleBg,
                    padding: "20px",
                    borderRadius: "16px",
                    border: `1px solid ${borderColor}`,
                  }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      color: subTextColor,
                      marginBottom: "16px",
                      fontWeight: 600,
                    }}
                  >
                    Complementary
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "12px",
                      justifyContent: "center",
                    }}
                  >
                    {harmonies.complementary.map((c: any) =>
                      renderColorBlock(c)
                    )}
                  </div>
                </div>
                <div
                  style={{
                    background: subtleBg,
                    padding: "20px",
                    borderRadius: "16px",
                    border: `1px solid ${borderColor}`,
                  }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      color: subTextColor,
                      marginBottom: "16px",
                      fontWeight: 600,
                    }}
                  >
                    Analogous
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "12px",
                      justifyContent: "center",
                    }}
                  >
                    {harmonies.analogous.map((c: any) => renderColorBlock(c))}
                  </div>
                </div>
                <div
                  style={{
                    background: subtleBg,
                    padding: "20px",
                    borderRadius: "16px",
                    border: `1px solid ${borderColor}`,
                  }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      color: subTextColor,
                      marginBottom: "16px",
                      fontWeight: 600,
                    }}
                  >
                    Triadic
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "12px",
                      justifyContent: "center",
                    }}
                  >
                    {harmonies.triadic.map((c: any) => renderColorBlock(c))}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "40px" }}>
              <div style={{ flex: 1 }}>
                <h3
                  style={{
                    fontSize: "12px",
                    color: accentColor,
                    marginBottom: "20px",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                  }}
                >
                  Variants
                </h3>
                <div style={{ display: "flex", gap: "16px" }}>
                  {renderColorBlock(variants.invert, "Invert")}
                  {renderColorBlock(variants.grayscale, "Gray")}
                  {renderColorBlock(variants.sepia, "Sepia")}
                </div>
              </div>

              <div style={{ flex: 1 }}>
                <h3
                  style={{
                    fontSize: "12px",
                    color: accentColor,
                    marginBottom: "20px",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                  }}
                >
                  Blindness Sim
                </h3>
                <div
                  style={{
                    display: "flex",
                    gap: "16px",
                    overflowX: "auto",
                    paddingBottom: "4px",
                  }}
                >
                  {simulations.map((sim) => {
                    const sRgb = simulateColorBlindness(
                      rgb.r,
                      rgb.g,
                      rgb.b,
                      sim.type
                    );
                    return renderColorBlock(sRgb, sim.label.slice(0, 4) + ".");
                  })}
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              height: "56px",
              background: "rgba(0,0,0,0.4)",
              borderTop: `1px solid ${borderColor}`,
              padding: "0 40px",
              display: "flex",
              alignItems: "center",
              gap: "24px",
              marginRight: "20px",
            }}
          >
            <div
              style={{
                fontSize: "10px",
                fontWeight: 700,
                color: subTextColor,
                letterSpacing: "0.8px",
                textTransform: "uppercase",
              }}
            >
              History
            </div>
            <div
              style={{
                display: "flex",
                gap: "10px",
                overflowX: "auto",
                flex: 1,
                padding: "8px 4px",
                scrollbarWidth: "none",
                alignItems: "center",
                maskImage:
                  "linear-gradient(to right, black 90%, transparent 100%)",
                WebkitMaskImage:
                  "linear-gradient(to right, black 90%, transparent 100%)",
              }}
            >
              {history.map((c, i) => (
                <div
                  key={i}
                  title={c}
                  onClick={() => onSelectHistoryColor(c)}
                  style={{
                    minWidth: "22px",
                    height: "22px",
                    background: c,
                    borderRadius: "6px",
                    cursor: "pointer",
                    border:
                      c === color
                        ? `2px solid #fff`
                        : `1px solid rgba(255,255,255,0.15)`,
                    transition:
                      "all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                    boxShadow:
                      c === color
                        ? `0 0 12px ${c}80`
                        : "0 2px 4px rgba(0,0,0,0.2)",
                    transform: c === color ? "scale(1.2)" : "scale(1)",
                  }}
                  onMouseOver={(e) => {
                    if (c !== color) {
                      e.currentTarget.style.transform =
                        "scale(1.15) translateY(-2px)";
                      e.currentTarget.style.boxShadow = `0 4px 8px ${c}40`;
                      e.currentTarget.style.border = `1px solid rgba(255,255,255,0.5)`;
                    }
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform =
                      c === color ? "scale(1.2)" : "scale(1)";
                    e.currentTarget.style.boxShadow =
                      c === color
                        ? `0 0 12px ${c}80`
                        : "0 2px 4px rgba(0,0,0,0.2)";
                    e.currentTarget.style.border =
                      c === color
                        ? `2px solid #fff`
                        : `1px solid rgba(255,255,255,0.15)`;
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); borderRadius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
}

export default memo(ColorResult);
