// The Passport Page of a Country That Isn't There
// make.fun program/v1 entry — Node 22, stdlib only, no network, deterministic.
// Draws one invented passport spread (1024x1024 PNG) for the Republic of
// Velmora, a landlocked mountain republic that does not exist, and writes it
// to /output/entry.png (or $OUTPUT_PATH when set, for local checks).
//
// The spread is built entirely in code: a vector data page with a drawn
// portrait and a real ICAO MRZ (check digits computed), a visa sticker, nine
// entry/exit stamps that form one consistent travel history (every stamp
// after the 12 JAN 2024 issue date, in chronological order), and one telling
// paperwork detail: the passport is valid for land borders only, because
// Velmora has no seaport.
//
// Invented country: VELMORA — capital Tarnov. Holder: Mara Ilsen,
// born 14 MAR 1988 in Tarnov. Neighbours: Ravnia, Drenovia, Kalden.

import * as fs from "node:fs";
import * as path from "node:path";
import * as zlib from "node:zlib";
import * as crypto from "node:crypto";

// ---------------------------------------------------------------------------
// 5x7 bitmap font (glyph = 7 rows of 5 bits). One family, three sizes via
// integer scaling, so the whole document holds together typographically.
// ---------------------------------------------------------------------------
const GLYPHS: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "<": ["00010", "00100", "01000", "10000", "01000", "00100", "00010"],
  ">": ["01000", "00100", "00010", "00001", "00010", "00100", "01000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
  "+": ["00000", "00100", "00100", "11111", "00100", "00100", "00000"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00110", "00100", "00000", "00100"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
  "=": ["00000", "00000", "11111", "00000", "11111", "00000", "00000"],
  '"': ["01010", "01010", "00000", "00000", "00000", "00000", "00000"],
  ";": ["00000", "01100", "01100", "00000", "01100", "00100", "01000"],
  _: ["00000", "00000", "00000", "00000", "00000", "00000", "11111"],
  "*": ["00000", "10101", "01110", "10101", "00000", "00000", "00000"],
};

function textWidth(s: string, scale: number, advance?: number): number {
  const adv = advance ?? 6 * scale;
  return s.length * adv - (advance ?? scale);
}

// ---------------------------------------------------------------------------
// Canvas: an RGB pixel buffer with vector drawing helpers.
// ---------------------------------------------------------------------------
type RGB = [number, number, number];

class Canvas {
  readonly w: number;
  readonly h: number;
  readonly buf: Uint8Array; // RGB, row-major
  constructor(w: number, h: number, fill: RGB) {
    this.w = w;
    this.h = h;
    this.buf = new Uint8Array(w * h * 3);
    this.fillRect(0, 0, w, h, fill);
  }
  set(x: number, y: number, c: RGB): void {
    const xi = Math.round(x);
    const yi = Math.round(y);
    if (xi < 0 || yi < 0 || xi >= this.w || yi >= this.h) return;
    const i = (yi * this.w + xi) * 3;
    this.buf[i] = c[0];
    this.buf[i + 1] = c[1];
    this.buf[i + 2] = c[2];
  }
  get(x: number, y: number): RGB {
    const i = (y * this.w + x) * 3;
    return [this.buf[i], this.buf[i + 1], this.buf[i + 2]];
  }
  fillRect(x: number, y: number, w: number, h: number, c: RGB): void {
    const x0 = Math.max(0, Math.round(x));
    const y0 = Math.max(0, Math.round(y));
    const x1 = Math.min(this.w, Math.round(x + w));
    const y1 = Math.min(this.h, Math.round(y + h));
    for (let yy = y0; yy < y1; yy++) {
      let i = (yy * this.w + x0) * 3;
      for (let xx = x0; xx < x1; xx++) {
        this.buf[i] = c[0];
        this.buf[i + 1] = c[1];
        this.buf[i + 2] = c[2];
        i += 3;
      }
    }
  }
  rect(x: number, y: number, w: number, h: number, c: RGB, t = 1): void {
    this.fillRect(x, y, w, t, c);
    this.fillRect(x, y + h - t, w, t, c);
    this.fillRect(x, y, t, h, c);
    this.fillRect(x + w - t, y, t, h, c);
  }
  hline(x0: number, x1: number, y: number, c: RGB, t = 1): void {
    this.fillRect(Math.min(x0, x1), y, Math.abs(x1 - x0), t, c);
  }
  vline(x: number, y0: number, y1: number, c: RGB, t = 1): void {
    this.fillRect(x, Math.min(y0, y1), t, Math.abs(y1 - y0), c);
  }
  // Bresenham line.
  line(x0: number, y0: number, x1: number, y1: number, c: RGB, t = 1): void {
    let ax = Math.round(x0);
    let ay = Math.round(y0);
    const bx = Math.round(x1);
    const by = Math.round(y1);
    const dx = Math.abs(bx - ax);
    const dy = -Math.abs(by - ay);
    const sx = ax < bx ? 1 : -1;
    const sy = ay < by ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      if (t <= 1) this.set(ax, ay, c);
      else this.fillRect(ax - Math.floor(t / 2), ay - Math.floor(t / 2), t, t, c);
      if (ax === bx && ay === by) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        ax += sx;
      }
      if (e2 <= dx) {
        err += dx;
        ay += sy;
      }
    }
  }
  // Filled ellipse (midpoint scanline).
  ellipse(cx: number, cy: number, rx: number, ry: number, c: RGB): void {
    for (let yy = Math.floor(cy - ry); yy <= Math.ceil(cy + ry); yy++) {
      const t = (yy - cy) / ry;
      if (t * t > 1) continue;
      const hw = rx * Math.sqrt(1 - t * t);
      this.fillRect(cx - hw, yy, hw * 2, 1, c);
    }
  }
  ellipseOutline(cx: number, cy: number, rx: number, ry: number, c: RGB, t = 1): void {
    const steps = Math.max(64, Math.floor(2 * Math.PI * Math.max(rx, ry)));
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * 2 * Math.PI;
      this.fillRect(
        cx + rx * Math.cos(a) - t / 2,
        cy + ry * Math.sin(a) - t / 2,
        t,
        t,
        c,
      );
    }
  }
  // Filled polygon (even-odd scanline).
  poly(points: [number, number][], c: RGB): void {
    let minY = Infinity;
    let maxY = -Infinity;
    for (const [, y] of points) {
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const xs: number[] = [];
      for (let i = 0; i < points.length; i++) {
        const [x0, y0] = points[i];
        const [x1, y1] = points[(i + 1) % points.length];
        if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) {
          xs.push(x0 + ((y - y0) / (y1 - y0)) * (x1 - x0));
        }
      }
      xs.sort((a, b) => a - b);
      for (let i = 0; i + 1 < xs.length; i += 2) {
        this.fillRect(xs[i], y, xs[i + 1] - xs[i], 1, c);
      }
    }
  }
  polyOutline(points: [number, number][], c: RGB, t = 1): void {
    for (let i = 0; i < points.length; i++) {
      const [x0, y0] = points[i];
      const [x1, y1] = points[(i + 1) % points.length];
      this.line(x0, y0, x1, y1, c, t);
    }
  }
  // Alpha-blend a colour over the pixel (a in 0..1).
  blend(x: number, y: number, c: RGB, a: number): void {
    const xi = Math.round(x);
    const yi = Math.round(y);
    if (xi < 0 || yi < 0 || xi >= this.w || yi >= this.h) return;
    const i = (yi * this.w + xi) * 3;
    this.buf[i] = Math.round(this.buf[i] * (1 - a) + c[0] * a);
    this.buf[i + 1] = Math.round(this.buf[i + 1] * (1 - a) + c[1] * a);
    this.buf[i + 2] = Math.round(this.buf[i + 2] * (1 - a) + c[2] * a);
  }
  // Draw one glyph at integer scale.
  glyph(ch: string, x: number, y: number, scale: number, c: RGB): void {
    const g = GLYPHS[ch] ?? GLYPHS["?"];
    for (let r = 0; r < 7; r++) {
      for (let col = 0; col < 5; col++) {
        if (g[r][col] === "1") {
          this.fillRect(x + col * scale, y + r * scale, scale, scale, c);
        }
      }
    }
  }
  // Text. `advance` overrides the per-character step (used for tight MRZ).
  text(s: string, x: number, y: number, scale: number, c: RGB, advance?: number): void {
    const adv = advance ?? 6 * scale;
    let cx = x;
    for (const ch of s) {
      this.glyph(ch, cx, y, scale, c);
      cx += adv;
    }
  }
  // Same, but bold: draw twice, one pixel right.
  textBold(s: string, x: number, y: number, scale: number, c: RGB, advance?: number): void {
    this.text(s, x, y, scale, c, advance);
    this.text(s, x + 1, y, scale, c, advance);
  }
  textCentered(s: string, cx: number, y: number, scale: number, c: RGB, advance?: number): void {
    this.text(s, cx - textWidth(s, scale, advance) / 2, y, scale, c, advance);
  }
  // Composite an RGBA buffer rotated by `deg` about its centre onto (cx, cy).
  blitRotated(src: { w: number; h: number; buf: Uint8Array }, cx: number, cy: number, deg: number): void {
    const rad = (deg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const hw = src.w / 2;
    const hh = src.h / 2;
    const R = Math.ceil(Math.sqrt(hw * hw + hh * hh));
    for (let dy = -R; dy <= R; dy++) {
      for (let dx = -R; dx <= R; dx++) {
        // Inverse rotation: source coords for this destination offset.
        const sx = cos * dx + sin * dy + hw;
        const sy = -sin * dx + cos * dy + hh;
        const sxi = Math.floor(sx);
        const syi = Math.floor(sy);
        if (sxi < 0 || syi < 0 || sxi >= src.w || syi >= src.h) continue;
        const si = (syi * src.w + sxi) * 4;
        const a = src.buf[si + 3] / 255;
        if (a <= 0) continue;
        const dxn = Math.round(cx + dx);
        const dyn = Math.round(cy + dy);
        if (dxn < 0 || dyn < 0 || dxn >= this.w || dyn >= this.h) continue;
        const di = (dyn * this.w + dxn) * 3;
        this.buf[di] = Math.round(this.buf[di] * (1 - a) + src.buf[si] * a);
        this.buf[di + 1] = Math.round(this.buf[di + 1] * (1 - a) + src.buf[si + 1] * a);
        this.buf[di + 2] = Math.round(this.buf[di + 2] * (1 - a) + src.buf[si + 2] * a);
      }
    }
  }
}

// RGBA scratch canvas (for stamps, which are drawn then rotated).
class AlphaCanvas {
  readonly w: number;
  readonly h: number;
  readonly buf: Uint8Array; // RGBA
  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.buf = new Uint8Array(w * h * 4);
  }
  set(x: number, y: number, c: RGB, a = 255): void {
    const xi = Math.round(x);
    const yi = Math.round(y);
    if (xi < 0 || yi < 0 || xi >= this.w || yi >= this.h) return;
    const i = (yi * this.w + xi) * 4;
    this.buf[i] = c[0];
    this.buf[i + 1] = c[1];
    this.buf[i + 2] = c[2];
    this.buf[i + 3] = a;
  }
  fillRect(x: number, y: number, w: number, h: number, c: RGB, a = 255): void {
    const x0 = Math.max(0, Math.round(x));
    const y0 = Math.max(0, Math.round(y));
    const x1 = Math.min(this.w, Math.round(x + w));
    const y1 = Math.min(this.h, Math.round(y + h));
    for (let yy = y0; yy < y1; yy++) {
      let i = (yy * this.w + x0) * 4;
      for (let xx = x0; xx < x1; xx++) {
        this.buf[i] = c[0];
        this.buf[i + 1] = c[1];
        this.buf[i + 2] = c[2];
        this.buf[i + 3] = a;
        i += 4;
      }
    }
  }
  rect(x: number, y: number, w: number, h: number, c: RGB, t = 1, a = 255): void {
    this.fillRect(x, y, w, t, c, a);
    this.fillRect(x, y + h - t, w, t, c, a);
    this.fillRect(x, y, t, h, c, a);
    this.fillRect(x + w - t, y, t, h, c, a);
  }
  line(x0: number, y0: number, x1: number, y1: number, c: RGB, t = 1): void {
    let ax = Math.round(x0);
    let ay = Math.round(y0);
    const bx = Math.round(x1);
    const by = Math.round(y1);
    const dx = Math.abs(bx - ax);
    const dy = -Math.abs(by - ay);
    const sx = ax < bx ? 1 : -1;
    const sy = ay < by ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      if (t <= 1) this.set(ax, ay, c);
      else this.fillRect(ax - Math.floor(t / 2), ay - Math.floor(t / 2), t, t, c);
      if (ax === bx && ay === by) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        ax += sx;
      }
      if (e2 <= dx) {
        err += dx;
        ay += sy;
      }
    }
  }
  glyph(ch: string, x: number, y: number, scale: number, c: RGB): void {
    const g = GLYPHS[ch] ?? GLYPHS["?"];
    for (let r = 0; r < 7; r++) {
      for (let col = 0; col < 5; col++) {
        if (g[r][col] === "1") this.fillRect(x + col * scale, y + r * scale, scale, scale, c);
      }
    }
  }
  text(s: string, x: number, y: number, scale: number, c: RGB, advance?: number): void {
    const adv = advance ?? 6 * scale;
    let cx = x;
    for (const ch of s) {
      this.glyph(ch, cx, y, scale, c);
      cx += adv;
    }
  }
  textBold(s: string, x: number, y: number, scale: number, c: RGB, advance?: number): void {
    this.text(s, x, y, scale, c, advance);
    this.text(s, x + 1, y, scale, c, advance);
  }
  textCentered(s: string, cx: number, y: number, scale: number, c: RGB, advance?: number): void {
    this.text(s, cx - textWidth(s, scale, advance) / 2, y, scale, c, advance);
  }
}

// ---------------------------------------------------------------------------
// PNG encoding (stdlib only): CRC32 + zlib deflate, filter 0, colour type 2.
// ---------------------------------------------------------------------------
const CRC_TABLE: Uint32Array = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}

function encodePNG(cv: Canvas): Buffer {
  const w = cv.w;
  const h = cv.h;
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0; // filter none
    raw.set(cv.buf.subarray(y * w * 3, (y + 1) * w * 3), y * (w * 3 + 1) + 1);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// ICAO MRZ check digits (weights 7, 3, 1; A=10 .. Z=35, '<'=0).
// ---------------------------------------------------------------------------
function mrzValue(ch: string): number {
  if (ch >= "0" && ch <= "9") return ch.charCodeAt(0) - 48;
  if (ch >= "A" && ch <= "Z") return ch.charCodeAt(0) - 55;
  return 0;
}
function mrzCheck(s: string): string {
  const w = [7, 3, 1];
  let sum = 0;
  for (let i = 0; i < s.length; i++) sum += mrzValue(s[i]) * w[i % 3];
  return String(sum % 10);
}
function padRight(s: string, n: number, ch = "<"): string {
  return s.length >= n ? s.slice(0, n) : s + ch.repeat(n - s.length);
}

function buildMRZ(): [string, string] {
  const line1 = padRight("P<VELILSEN<<MARA", 44);
  const docNo = "VM4829137";
  const dob = "880314";
  const exp = "340112";
  const personal = "<<<<<<<<<<<<<<";
  const line2 =
    docNo +
    mrzCheck(docNo) +
    "VEL" +
    dob +
    mrzCheck(dob) +
    "F" +
    exp +
    mrzCheck(exp) +
    personal +
    mrzCheck(personal);
  const full2 = line2 + mrzCheck(line2);
  return [line1, full2];
}

// ---------------------------------------------------------------------------
// Palette — one restrained document palette, used everywhere.
// ---------------------------------------------------------------------------
const INK: RGB = [28, 38, 52]; // dark navy ink
const GREEN: RGB = [31, 77, 58]; // Velmora green (headers, emblem, visa)
const GREEN_LT: RGB = [214, 224, 210]; // faint guilloche
const PAPER: RGB = [247, 243, 232]; // passport paper
const PAPER2: RGB = [242, 237, 222]; // slightly deeper paper
const DESK: RGB = [46, 52, 56]; // desk behind the spread
const RED: RGB = [163, 51, 39]; // condition box, departure stamps
const BLUE: RGB = [42, 78, 143]; // arrival stamps
const GREY: RGB = [90, 96, 102]; // small labels
const SKIN: RGB = [217, 169, 134];
const SKIN_DK: RGB = [196, 146, 110];
const HAIR: RGB = [74, 50, 38];
const JACKET: RGB = [46, 58, 69];
const PHOTO_BG: RGB = [174, 191, 203];

// ---------------------------------------------------------------------------
// Coat of arms: two mountain peaks under a star, inside a thin ring.
// ---------------------------------------------------------------------------
function drawEmblem(cv: Canvas, cx: number, cy: number, r: number, c: RGB): void {
  cv.ellipseOutline(cx, cy, r, r, c, 2);
  cv.ellipseOutline(cx, cy, r - 4, r - 4, c, 1);
  // Star above the peaks.
  const sx = cx;
  const sy = cy - r + 9;
  const s = 5;
  cv.poly(
    [
      [sx, sy - s],
      [sx + 1.6, sy - 1.6],
      [sx + s, sy - 1.6],
      [sx + 2.4, sy + 1.6],
      [sx + 3.6, sy + s],
      [sx, sy + 2.6],
      [sx - 3.6, sy + s],
      [sx - 2.4, sy + 1.6],
      [sx - s, sy - 1.6],
      [sx - 1.6, sy - 1.6],
    ],
    c,
  );
  // Two peaks, the right one taller, with a snow cap line.
  cv.poly(
    [
      [cx - r + 8, cy + r - 10],
      [cx - r + 22, cy - 2],
      [cx - r + 30, cy + 6],
      [cx - r + 38, cy - 8],
      [cx - r + 52, cy + r - 10],
    ],
    c,
  );
  cv.line(cx - r + 20, cy, cx - r + 24, cy + 4, PAPER, 2);
  cv.line(cx - r + 36, cy - 6, cx - r + 40, cy - 2, PAPER, 2);
  cv.hline(cx - r + 8, cx + r - 8, cy + r - 10, c, 2);
}

// ---------------------------------------------------------------------------
// Passport portrait, drawn in code: head, bob hair, jacket and blouse.
// ---------------------------------------------------------------------------
function drawPortrait(cv: Canvas, x: number, y: number, w: number, h: number): void {
  cv.fillRect(x, y, w, h, PHOTO_BG);
  // faint vertical backdrop bands, like a photo-studio screen
  for (let bx = x + 18; bx < x + w; bx += 36) {
    cv.fillRect(bx, y, 2, h, [158, 176, 190]);
  }
  const cx = x + w / 2;
  // shoulders / jacket
  cv.poly(
    [
      [cx - 62, y + h],
      [cx - 58, y + 168],
      [cx - 26, y + 150],
      [cx + 26, y + 150],
      [cx + 58, y + 168],
      [cx + 62, y + h],
    ],
    JACKET,
  );
  // blouse V + collar
  cv.poly(
    [[cx - 24, y + 152], [cx + 24, y + 152], [cx, y + 186]],
    [238, 238, 234],
  );
  cv.poly(
    [[cx - 26, y + 150], [cx - 8, y + 166], [cx, y + 158], [cx + 8, y + 166], [cx + 26, y + 150], [cx + 18, y + 146], [cx, y + 152], [cx - 18, y + 146]],
    [226, 226, 222],
  );
  // jacket lapels
  cv.line(cx - 24, y + 154, cx - 8, y + 196, [30, 40, 48], 2);
  cv.line(cx + 24, y + 154, cx + 8, y + 196, [30, 40, 48], 2);
  // neck
  cv.fillRect(cx - 11, y + 128, 22, 26, SKIN);
  cv.fillRect(cx - 11, y + 128, 22, 6, SKIN_DK);
  // ears
  cv.ellipse(cx - 35, y + 84, 6, 10, SKIN);
  cv.ellipse(cx + 35, y + 84, 6, 10, SKIN);
  // head
  cv.ellipse(cx, y + 80, 35, 45, SKIN);
  // hair: bob covering the top and sides, down past the jaw
  cv.poly(
    [
      [cx - 37, y + 108],
      [cx - 39, y + 66],
      [cx - 30, y + 38],
      [cx - 12, y + 28],
      [cx + 12, y + 28],
      [cx + 30, y + 38],
      [cx + 39, y + 66],
      [cx + 37, y + 108],
      [cx + 28, y + 108],
      [cx + 30, y + 62],
      [cx + 22, y + 44],
      [cx, y + 38],
      [cx - 22, y + 44],
      [cx - 30, y + 62],
      [cx - 28, y + 108],
    ],
    HAIR,
  );
  // eyebrows
  cv.line(cx - 22, y + 68, cx - 8, y + 66, HAIR, 2);
  cv.line(cx + 8, y + 66, cx + 22, y + 68, HAIR, 2);
  // eyes
  cv.ellipse(cx - 15, y + 76, 4, 3, [32, 28, 26]);
  cv.ellipse(cx + 15, y + 76, 4, 3, [32, 28, 26]);
  cv.set(cx - 16, y + 75, [240, 240, 235]);
  cv.set(cx + 14, y + 75, [240, 240, 235]);
  // nose
  cv.line(cx, y + 80, cx - 2, y + 94, SKIN_DK, 2);
  cv.line(cx - 2, y + 94, cx + 3, y + 96, SKIN_DK, 2);
  // mouth: a calm closed-lip line
  cv.line(cx - 9, y + 110, cx + 9, y + 110, [122, 62, 52], 2);
  cv.line(cx - 5, y + 112, cx + 5, y + 112, [150, 92, 80], 1);
}

// ---------------------------------------------------------------------------
// A border stamp, drawn on a transparent tile and rotated when pasted.
// ---------------------------------------------------------------------------
interface StampSpec {
  country: string;
  kind: "ARRIVAL" | "DEPARTURE";
  date: string; // e.g. "04 FEB 2024"
  post: string; // border post / code line
  deg: number;
}

function makeStamp(spec: StampSpec, ink: RGB): AlphaCanvas {
  const W = 214;
  const H = 118;
  const t = new AlphaCanvas(W, H);
  t.rect(2, 2, W - 4, H - 4, ink, 3);
  t.rect(8, 8, W - 16, H - 16, ink, 1);
  t.textCentered(spec.country, W / 2, 16, 2, ink);
  t.line(16, 36, W - 16, 36, ink, 1);
  t.textBold(spec.kind, W / 2 - textWidth(spec.kind, 2) / 2, 46, 2, ink);
  t.textCentered(spec.date, W / 2, 70, 2, ink);
  t.line(16, 92, W - 16, 92, ink, 1);
  t.textCentered(spec.post, W / 2, 98, 1, ink);
  return t;
}

// The consistent travel history. Issue: 12 JAN 2024. Every stamp is after
// it, in chronological order, and every arrival is answered by a departure
// from the same country — except the last, an arrival in Kalden with the
// traveller still there.
const STAMPS: StampSpec[] = [
  { country: "VELMORA", kind: "DEPARTURE", date: "03 FEB 2024", post: "TARNOV - POST 4", deg: -6 },
  { country: "RAVNIA", kind: "ARRIVAL", date: "04 FEB 2024", post: "KESTREL PASS", deg: 5 },
  { country: "RAVNIA", kind: "DEPARTURE", date: "18 FEB 2024", post: "KESTREL PASS", deg: -4 },
  { country: "VELMORA", kind: "ARRIVAL", date: "19 FEB 2024", post: "TARNOV - POST 4", deg: 7 },
  { country: "VELMORA", kind: "DEPARTURE", date: "07 JUN 2024", post: "TARNOV - POST 4", deg: -5 },
  { country: "DRENOVIA", kind: "ARRIVAL", date: "08 JUN 2024", post: "VISA DR-2024-1187", deg: 6 },
  { country: "DRENOVIA", kind: "DEPARTURE", date: "02 JUL 2024", post: "VISA DR-2024-1187", deg: -7 },
  { country: "VELMORA", kind: "ARRIVAL", date: "03 JUL 2024", post: "TARNOV - POST 4", deg: 4 },
  { country: "VELMORA", kind: "DEPARTURE", date: "15 SEP 2024", post: "TARNOV - POST 4", deg: -6 },
  { country: "KALDEN", kind: "ARRIVAL", date: "16 SEP 2024", post: "SOUTH GATE", deg: 5 },
];

// ---------------------------------------------------------------------------
// The spread.
// ---------------------------------------------------------------------------
function field(cv: Canvas, label: string, value: string, x: number, ly: number, vy: number, bold = false): void {
  cv.text(label, x, ly, 1, GREY);
  if (bold) cv.textBold(value, x, vy, 2, INK);
  else cv.text(value, x, vy, 2, INK);
}

function buildSpread(): Canvas {
  const W = 1024;
  const H = 1024;
  const cv = new Canvas(W, H, DESK);

  // Page shadows, then the two pages.
  cv.fillRect(34, 54, 472, 928, [30, 34, 38]);
  cv.fillRect(530, 54, 472, 928, [30, 34, 38]);
  cv.fillRect(28, 48, 472, 928, PAPER);
  cv.fillRect(524, 48, 472, 928, PAPER);
  cv.rect(28, 48, 472, 928, [120, 112, 92], 1);
  cv.rect(524, 48, 472, 928, [120, 112, 92], 1);
  // Spine shadow between the pages.
  cv.fillRect(500, 48, 6, 928, [210, 202, 184]);
  cv.fillRect(518, 48, 6, 928, [210, 202, 184]);

  // ---- Left page: data page -------------------------------------------
  // faint guilloche waves
  for (let y = 200; y < 790; y += 12) {
    for (let x = 36; x < 492; x += 2) {
      const yy = y + Math.round(3 * Math.sin(((x - 36) / 60) * Math.PI * 2));
      cv.set(x, yy, GREEN_LT);
    }
  }

  drawEmblem(cv, 264, 84, 26, GREEN);
  cv.textCentered("REPUBLIC OF VELMORA", 264, 116, 3, GREEN);
  cv.textCentered("PASSPORT", 264, 146, 4, INK);
  cv.textCentered("PASSEPORT", 264, 176, 1, GREY);
  cv.hline(60, 468, 192, INK, 1);

  // portrait, framed
  drawPortrait(cv, 46, 208, 150, 210);
  cv.rect(46, 208, 150, 210, INK, 2);

  // fields beside the portrait
  cv.text("TYPE", 214, 208, 1, GREY);
  cv.text("CODE", 268, 208, 1, GREY);
  cv.text("NO.", 330, 208, 1, GREY);
  cv.textBold("P", 214, 222, 2, INK);
  cv.textBold("VEL", 268, 222, 2, INK);
  cv.textBold("VM4829137", 330, 222, 2, INK);
  field(cv, "SURNAME", "ILSEN", 214, 256, 270, true);
  field(cv, "GIVEN NAMES", "MARA", 214, 298, 312, true);
  field(cv, "NATIONALITY", "VELMORAN", 214, 340, 354, true);
  field(cv, "DATE OF BIRTH", "14 MAR 1988", 214, 382, 396, true);

  // lower data block
  field(cv, "SEX", "F", 44, 436, 450, true);
  field(cv, "DATE OF ISSUE", "12 JAN 2024", 264, 436, 450, true);
  field(cv, "PLACE OF BIRTH", "TARNOV", 44, 484, 498, true);
  field(cv, "DATE OF EXPIRY", "12 JAN 2034", 264, 484, 498, true);
  field(cv, "AUTHORITY", "MINISTRY OF THE INTERIOR - TARNOV", 44, 532, 546, true);

  // holder's signature (a drawn squiggle) + languages
  cv.line(48, 596, 90, 586, INK, 2);
  cv.line(90, 586, 130, 598, INK, 2);
  cv.line(130, 598, 170, 584, INK, 2);
  cv.line(170, 584, 210, 596, INK, 2);
  cv.line(210, 596, 250, 588, INK, 2);
  cv.line(250, 588, 290, 596, INK, 2);
  cv.hline(44, 300, 606, INK, 1);
  cv.text("HOLDER'S SIGNATURE", 44, 616, 1, GREY);
  cv.text("LANGUAGES", 330, 580, 1, GREY);
  cv.text("VELMORAN - FRENCH", 330, 594, 1, INK);

  // the telling detail: land borders only — Velmora has no seaport.
  cv.rect(44, 650, 440, 122, RED, 2);
  cv.rect(48, 654, 432, 114, RED, 1);
  cv.textCentered("CONDITION OF ISSUE", 264, 664, 2, RED);
  cv.textCentered("VALID FOR LAND BORDERS ONLY.", 264, 690, 2, RED);
  cv.textCentered("VELMORA HAS NO SEAPORT.", 264, 714, 2, RED);
  cv.textCentered("MOUNTAIN TRANSIT PERMIT REQUIRED", 264, 738, 2, RED);
  cv.textCentered("ABOVE 2,000 M.", 264, 760, 1, RED);

  // machine-readable zone (real ICAO check digits)
  const [mrz1, mrz2] = buildMRZ();
  cv.fillRect(36, 800, 456, 84, PAPER2);
  cv.text(mrz1, 44, 816, 2, INK, 10);
  cv.text(mrz2, 44, 842, 2, INK, 10);
  cv.textCentered("THIS PASSPORT REMAINS THE PROPERTY OF THE REPUBLIC OF VELMORA.", 264, 912, 1, GREY);

  // ---- Right page: visas and stamps ------------------------------------
  cv.textCentered("VISAS", 760, 146, 4, INK);
  cv.textCentered("PAGES 12-13", 760, 176, 1, GREY);
  cv.hline(556, 964, 192, INK, 1);

  // Drenovia visa sticker
  cv.rect(540, 200, 440, 132, GREEN, 2);
  cv.rect(544, 204, 432, 124, GREEN, 1);
  cv.textBold("VISA - DRENOVIA", 556, 212, 2, GREEN);
  cv.text("NO.", 556, 240, 1, GREY);
  cv.text("DR-2024-1187", 620, 240, 2, INK);
  cv.text("ISSUED", 556, 266, 1, GREY);
  cv.text("20 MAY 2024 - TARNOV", 620, 266, 2, INK);
  cv.text("VALID", 556, 292, 1, GREY);
  cv.text("08 JUN - 07 JUL 2024", 620, 292, 2, INK);
  cv.text("FEE 25 KRONEN - PAID", 556, 312, 2, GREEN);

  // exit-tax stamp, stamped across the visa sticker
  const tax = new AlphaCanvas(180, 50);
  tax.rect(1, 1, 178, 48, RED, 2);
  tax.rect(5, 5, 170, 40, RED, 1);
  tax.textBold("EXIT TAX 40 KR", 90 - textWidth("EXIT TAX 40 KR", 2) / 2, 8, 2, RED);
  tax.textCentered("PAID 15 SEP 2024", 90, 30, 1, RED);
  cv.blitRotated(tax, 885, 218, -10);

  // the stamps, in chronological order down the page
  const colX = [647, 873];
  const rowY = [350, 472, 594, 716, 838];
  STAMPS.forEach((spec, i) => {
    const cx = colX[i % 2];
    const cy = rowY[Math.floor(i / 2)] + 59;
    const ink = spec.kind === "ARRIVAL" ? BLUE : RED;
    cv.blitRotated(makeStamp(spec, ink), cx, cy, spec.deg);
  });

  return cv;
}

function main(): void {
  const outPath = process.env.OUTPUT_PATH ?? "/output/entry.png";
  const cv = buildSpread();
  const png = encodePNG(cv);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, png);
  const sha = crypto.createHash("sha256").update(png).digest("hex");
  console.log(`wrote ${outPath} ${png.length} bytes sha256=${sha} ${cv.w}x${cv.h}`);
}

main();
