export function rgbToHsl(r: number, g: number, b: number) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function hslToRgb(h: number, s: number, l: number) {
    h /= 360;
    s /= 100;
    l /= 100;
    let r, g, b;

    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p: number, q: number, t: number) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }

    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255)
    };
}

export function rgbToCmyk(r: number, g: number, b: number) {
    let c = 1 - (r / 255);
    let m = 1 - (g / 255);
    let y = 1 - (b / 255);
    let k = Math.min(c, Math.min(m, y));

    if (k === 1) {
        return { c: 0, m: 0, y: 0, k: 100 };
    }

    c = (c - k) / (1 - k);
    m = (m - k) / (1 - k);
    y = (y - k) / (1 - k);

    return {
        c: Math.round(c * 100),
        m: Math.round(m * 100),
        y: Math.round(y * 100),
        k: Math.round(k * 100)
    };
}

export function rgbToHex(r: number, g: number, b: number) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

export function hexToRgb(hex: string) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

export function getLuminance(r: number, g: number, b: number) {
    const a = [r, g, b].map(v => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

export function getContrastRatio(rgb1: { r: number, g: number, b: number }, rgb2: { r: number, g: number, b: number }) {
    const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
    const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    return (brightest + 0.05) / (darkest + 0.05);
}

export function rgbToLab(r: number, g: number, b: number) {
    let R = r / 255;
    let G = g / 255;
    let B = b / 255;

    R = (R > 0.04045) ? Math.pow((R + 0.055) / 1.055, 2.4) : R / 12.92;
    G = (G > 0.04045) ? Math.pow((G + 0.055) / 1.055, 2.4) : G / 12.92;
    B = (B > 0.04045) ? Math.pow((B + 0.055) / 1.055, 2.4) : B / 12.92;

    R *= 100;
    G *= 100;
    B *= 100;

    const X = R * 0.4124 + G * 0.3576 + B * 0.1805;
    const Y = R * 0.2126 + G * 0.7152 + B * 0.0722;
    const Z = R * 0.0193 + G * 0.1192 + B * 0.9505;

    let x = X / 95.047;
    let y = Y / 100.000;
    let z = Z / 108.883;

    x = (x > 0.008856) ? Math.pow(x, 1 / 3) : (7.787 * x) + (16 / 116);
    y = (y > 0.008856) ? Math.pow(y, 1 / 3) : (7.787 * y) + (16 / 116);
    z = (z > 0.008856) ? Math.pow(z, 1 / 3) : (7.787 * z) + (16 / 116);

    const L = (116 * y) - 16;
    const a = 500 * (x - y);
    const b_val = 200 * (y - z);

    return { L, a, b: b_val };
}

export function deltaE(rgb1: { r: number, g: number, b: number }, rgb2: { r: number, g: number, b: number }) {
    const lab1 = rgbToLab(rgb1.r, rgb1.g, rgb1.b);
    const lab2 = rgbToLab(rgb2.r, rgb2.g, rgb2.b);

    const dL = lab1.L - lab2.L;
    const da = lab1.a - lab2.a;
    const db = lab1.b - lab2.b;

    return Math.sqrt(dL * dL + da * da + db * db);
}

export function deltaE2000(rgb1: { r: number, g: number, b: number }, rgb2: { r: number, g: number, b: number }) {
    const lab1 = rgbToLab(rgb1.r, rgb1.g, rgb1.b);
    const lab2 = rgbToLab(rgb2.r, rgb2.g, rgb2.b);

    const L1 = lab1.L, a1 = lab1.a, b1 = lab1.b;
    const L2 = lab2.L, a2 = lab2.a, b2 = lab2.b;

    const avgL = (L1 + L2) / 2;
    const C1 = Math.sqrt(a1 * a1 + b1 * b1);
    const C2 = Math.sqrt(a2 * a2 + b2 * b2);
    const avgC = (C1 + C2) / 2;

    const G = 0.5 * (1 - Math.sqrt(Math.pow(avgC, 7) / (Math.pow(avgC, 7) + Math.pow(25, 7))));

    const a1p = a1 * (1 + G);
    const a2p = a2 * (1 + G);

    const C1p = Math.sqrt(a1p * a1p + b1 * b1);
    const C2p = Math.sqrt(a2p * a2p + b2 * b2);

    const avgCp = (C1p + C2p) / 2;

    let h1p = Math.atan2(b1, a1p);
    if (h1p < 0) h1p += 2 * Math.PI;
    h1p = (h1p * 180) / Math.PI;

    let h2p = Math.atan2(b2, a2p);
    if (h2p < 0) h2p += 2 * Math.PI;
    h2p = (h2p * 180) / Math.PI;

    let avgHp = Math.abs(h1p - h2p) > 180 ? (h1p + h2p + 360) / 2 : (h1p + h2p) / 2;
    if (Math.abs(h1p - h2p) <= 180 && (h1p + h2p) == 0) avgHp = (h1p + h2p);

    if (Math.abs(h1p - h2p) > 180) {
        avgHp = (h1p + h2p + 360) / 2;
    } else {
        avgHp = (h1p + h2p) / 2;
    }

    const T = 1 - 0.17 * Math.cos((avgHp - 30) * Math.PI / 180)
        + 0.24 * Math.cos((2 * avgHp) * Math.PI / 180)
        + 0.32 * Math.cos((3 * avgHp + 6) * Math.PI / 180)
        - 0.20 * Math.cos((4 * avgHp - 63) * Math.PI / 180);

    let dhp = h2p - h1p;
    if (Math.abs(dhp) > 180) {
        if (h2p <= h1p) dhp += 360;
        else dhp -= 360;
    }

    const dLp = L2 - L1;
    const dCp = C2p - C1p;
    const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp / 2) * Math.PI / 180);

    const SL = 1 + (0.015 * Math.pow(avgL - 50, 2)) / Math.sqrt(20 + Math.pow(avgL - 50, 2));
    const SC = 1 + 0.045 * avgCp;
    const SH = 1 + 0.015 * avgCp * T;

    const dTheta = 30 * Math.exp(-Math.pow((avgHp - 275) / 25, 2));
    const RC = 2 * Math.sqrt(Math.pow(avgCp, 7) / (Math.pow(avgCp, 7) + Math.pow(25, 7)));
    const RT = -Math.sin(2 * dTheta * Math.PI / 180) * RC;

    const dE = Math.sqrt(
        Math.pow(dLp / SL, 2) +
        Math.pow(dCp / SC, 2) +
        Math.pow(dHp / SH, 2) +
        RT * (dCp / SC) * (dHp / SH)
    );

    return dE;
}

export type ColorBlindnessType = "protanopia" | "deuteranopia" | "tritanopia" | "achromatopsia";

export function simulateColorBlindness(r: number, g: number, b: number, type: ColorBlindnessType) {
    const linear = (v: number) => {
        v /= 255;
        return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };

    let R = linear(r);
    let G = linear(g);
    let B = linear(b);

    let finalR = 0, finalG = 0, finalB = 0;

    if (type === "protanopia") {
        finalR = 0.567 * R + 0.433 * G + 0.0 * B;
        finalG = 0.558 * R + 0.442 * G + 0.0 * B;
        finalB = 0.0 * R + 0.242 * G + 0.758 * B;
    } else if (type === "deuteranopia") {
        finalR = 0.625 * R + 0.375 * G + 0.0 * B;
        finalG = 0.7 * R + 0.3 * G + 0.0 * B;
        finalB = 0.0 * R + 0.3 * G + 0.7 * B;
    } else if (type === "tritanopia") {
        finalR = 0.95 * R + 0.05 * G + 0.0 * B;
        finalG = 0.0 * R + 0.433 * G + 0.567 * B;
        finalB = 0.0 * R + 0.475 * G + 0.525 * B;
    } else if (type === "achromatopsia") {
        const gray = 0.2126 * R + 0.7152 * G + 0.0722 * B;
        finalR = gray;
        finalG = gray;
        finalB = gray;
    }

    const delinear = (v: number) => {
        return v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
    };

    return {
        r: Math.min(255, Math.max(0, Math.round(delinear(finalR) * 255))),
        g: Math.min(255, Math.max(0, Math.round(delinear(finalG) * 255))),
        b: Math.min(255, Math.max(0, Math.round(delinear(finalB) * 255)))
    };
}



export function getHarmonies(r: number, g: number, b: number) {
    const { h, s, l } = rgbToHsl(r, g, b);

    const wrap = (hue: number) => (hue + 360) % 360;

    const harmonies = {
        complementary: [hslToRgb(wrap(h + 180), s, l)],
        analogous: [hslToRgb(wrap(h - 30), s, l), hslToRgb(wrap(h + 30), s, l)],
        triadic: [hslToRgb(wrap(h + 120), s, l), hslToRgb(wrap(h + 240), s, l)],
        tetradic: [hslToRgb(wrap(h + 90), s, l), hslToRgb(wrap(h + 180), s, l), hslToRgb(wrap(h + 270), s, l)],
        monochromatic: [
            hslToRgb(h, s, Math.max(0, l - 20)),
            hslToRgb(h, s, Math.min(100, l + 20))
        ]
    };

    return harmonies;
}

export function getColorVariants(r: number, g: number, b: number) {

    const invert = { r: 255 - r, g: 255 - g, b: 255 - b };


    const grayVal = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
    const grayscale = { r: grayVal, g: grayVal, b: grayVal };


    const tr = 0.393 * r + 0.769 * g + 0.189 * b;
    const tg = 0.349 * r + 0.686 * g + 0.168 * b;
    const tb = 0.272 * r + 0.534 * g + 0.131 * b;

    const sepia = {
        r: Math.min(255, Math.round(tr)),
        g: Math.min(255, Math.round(tg)),
        b: Math.min(255, Math.round(tb))
    };

    return { invert, grayscale, sepia };
}
