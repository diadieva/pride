"""Іконки Zappicon для сторінок репо: дістає обрані іконки з локального .fig і пише _nav/icons.css.

Сам набір у репо не кладемо (ліцензія забороняє його поширювати): `Zappicon v1.1.fig` лежить поруч,
у .gitignore. У репо потрапляють лише використані іконки — як data URI в _nav/icons.css.

Запуск (потрібен пакет zstandard):
    python3 design-system/icons/zappicon.py

Щоб додати іконку — допишіть її ім'я з Figma-файлу в ICONS і запустіть знову.
"""
import os, struct, sys, urllib.parse, zipfile, zlib

import zstandard

HERE = os.path.dirname(os.path.abspath(__file__))
FIG = os.path.join(HERE, "Zappicon v1.1.fig")
OUT = os.path.join(HERE, "..", "..", "_nav", "icons.css")
STYLE = "Filled"
ICONS = [
    "comment-text",   # слова людей (було 🗣)
    "puzzle-piece",   # сигнал продукту (🧩)
    "newspaper",      # третя сторона (📰)
    "globe",          # публічні сторінки (🌐)
    "lock",           # не бачили наживо (🔒)
    "check-circle",   # виконує (✅)
    "contrast",       # частково (◐)
    "xmark-circle",   # ні (❌)
    "sun", "moon",    # перемикач теми
    "menu-bars",      # кнопка навігатора на телефоні
    "minus", "plus",  # масштаб діаграм
    "arrows-out",     # вмістити діаграму в ширину
    "expand",         # діаграма на весь екран
]


# --- Декодер kiwi: формат canvas.fig усередині .fig ---

class Reader:
    def __init__(self, b): self.b = b; self.i = 0
    def byte(self):
        v = self.b[self.i]; self.i += 1; return v
    def varuint(self):
        r = s = 0
        while True:
            c = self.byte(); r |= (c & 127) << s
            if c < 128: return r
            s += 7
    def varint(self):
        v = self.varuint(); return ~(v >> 1) if v & 1 else v >> 1
    def float(self):
        if self.b[self.i] == 0: self.i += 1; return 0.0
        bits = int.from_bytes(self.b[self.i:self.i + 4], "little"); self.i += 4
        bits = ((bits << 23) | (bits >> 9)) & 0xFFFFFFFF
        return struct.unpack("<f", struct.pack("<I", bits))[0]
    def string(self):
        j = self.b.index(0, self.i); s = self.b[self.i:j].decode("utf-8", "replace"); self.i = j + 1; return s


def decode_canvas(path):
    raw = zipfile.ZipFile(path).read("canvas.fig")
    assert raw[:8] == b"fig-kiwi", "не схоже на .fig"
    chunks, off = [], 12
    while off < len(raw):
        n = struct.unpack("<I", raw[off:off + 4])[0]; chunks.append(raw[off + 4:off + 4 + n]); off += 4 + n
    unpack = lambda c: zstandard.ZstdDecompressor().decompressobj().decompress(c) if c[:4] == b"\x28\xb5\x2f\xfd" else zlib.decompress(c, -15)

    r = Reader(unpack(chunks[0])); defs = []
    for _ in range(r.varuint()):
        name, kind = r.string(), r.byte()
        defs.append((name, kind, [(r.string(), r.varint(), r.byte(), r.varuint()) for _ in range(r.varuint())]))
    index = {
        i: {v: (fn, t, a) for fn, t, a, v in fields} if kind == 2 else {v: fn for fn, t, a, v in fields}
        for i, (name, kind, fields) in enumerate(defs) if kind != 1
    }
    prim = ["bool", "byte", "int", "uint", "float", "string", "int64", "uint64"]

    def value(r, t):
        if t < 0:
            p = prim[~t]
            if p in ("bool", "byte"): return r.byte()
            if p in ("int", "int64"): return r.varint()
            if p in ("uint", "uint64"): return r.varuint()
            return r.float() if p == "float" else r.string()
        name, kind, fields = defs[t]
        if kind == 0: return index[t].get(r.varuint())
        if kind == 1: return {fn: field(r, ft, fa) for fn, ft, fa, fv in fields}
        out = {}
        while (v := r.varuint()) != 0:
            fn, ft, fa = index[t][v]; out[fn] = field(r, ft, fa)
        return out

    def field(r, t, arr):
        if not arr: return value(r, t)
        n = r.varuint()
        if t == -2:
            v = bytes(r.b[r.i:r.i + n]); r.i += n; return v
        return [value(r, t) for _ in range(n)]

    root = next(i for i, d in enumerate(defs) if d[0] == "Message")
    return value(Reader(unpack(chunks[1])), root)


# --- Геометрія вузлів → SVG ---

def icon_svgs(msg, names, style):
    nodes, blobs = msg["nodeChanges"], msg["blobs"]
    key = lambda g: (g["sessionID"], g["localID"])
    by_id = {key(n["guid"]): n for n in nodes}
    kids = {}
    for n in nodes:
        if "parentIndex" in n: kids.setdefault(key(n["parentIndex"]["guid"]), []).append(n)
    for v in kids.values(): v.sort(key=lambda n: n["parentIndex"].get("position", ""))

    def matrix(n):
        t = n.get("transform", {})
        return (t.get("m00", 1), t.get("m01", 0), t.get("m02", 0), t.get("m10", 0), t.get("m11", 1), t.get("m12", 0))

    def mul(A, B):
        return (A[0]*B[0] + A[1]*B[3], A[0]*B[1] + A[1]*B[4], A[0]*B[2] + A[1]*B[5] + A[2],
                A[3]*B[0] + A[4]*B[3], A[3]*B[1] + A[4]*B[4], A[3]*B[2] + A[4]*B[5] + A[5])

    def path(blob, M):
        b, i, d = blobs[blob]["bytes"], 0, []
        while i < len(b):
            c = b[i]; i += 1
            if c == 0: d.append("Z"); continue
            pts = []
            for _ in range({1: 1, 2: 1, 3: 2, 4: 3}[c]):
                x, y = struct.unpack_from("<ff", b, i); i += 8
                pts.append("%g %g" % (round(M[0]*x + M[1]*y + M[2], 3), round(M[3]*x + M[4]*y + M[5], 3)))
            d.append(" MLQC"[c] + " ".join(pts))
        return "".join(d)

    def render(n, M, parts, opacity):
        if n.get("visible", True) is False: return
        assert not n.get("mask"), "маски не підтримано: " + str(n.get("name"))
        opacity *= n.get("opacity", 1.0)
        for geom, paints in (("fillGeometry", "fillPaints"), ("strokeGeometry", "strokePaints")):
            ps = [p for p in n.get(paints) or [] if p.get("visible", True) and p.get("type") == "SOLID"]
            if not ps: continue
            a = opacity * ps[0].get("opacity", 1.0) * ps[0].get("color", {}).get("a", 1.0)
            for gm in n.get(geom) or []:
                attrs = ' fill-rule="evenodd"' if gm.get("windingRule") == "ODD" else ""
                attrs += ' fill-opacity="%g"' % round(a, 3) if a < 0.999 else ""
                parts.append('<path d="%s"%s/>' % (path(gm["commandsBlob"], M), attrs))
        for c in kids.get(key(n["guid"]), []):
            render(c, mul(M, matrix(c)), parts, opacity)

    variants = {}
    for n in nodes:
        if n.get("type") == "SYMBOL" and n.get("name") == "Style=" + style and "parentIndex" in n:
            variants.setdefault(by_id[key(n["parentIndex"]["guid"])].get("name"), n)
    for name in names:
        sym = variants[name]; parts = []
        for c in kids.get(key(sym["guid"]), []):
            render(c, matrix(c), parts, 1.0)
        yield name, '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %g %g">%s</svg>' % (
            sym["size"]["x"], sym["size"]["y"], "".join(parts))


def main():
    msg = decode_canvas(FIG)
    lines = [
        "/* Іконки сторінок репо — Zappicon v1.1, стиль %s (www.zappicon.com).\n"
        "   Згенеровано design-system/icons/zappicon.py — не редагувати вручну.\n"
        "   Використання: <span class=\"i i-globe\" role=\"img\" aria-label=\"…\"></span>; колір — currentColor. */\n" % STYLE,
        ".i {\n  display: inline-block;\n  flex: none;\n  width: 1.15em;\n  height: 1.15em;\n  vertical-align: -0.22em;\n"
        "  background-color: currentColor;\n  -webkit-mask: var(--i) center / contain no-repeat;\n  mask: var(--i) center / contain no-repeat;\n}\n",
    ]
    for name, svg in icon_svgs(msg, ICONS, STYLE):
        lines.append('.i-%s { --i: url("data:image/svg+xml,%s"); }\n' % (name, urllib.parse.quote(svg, safe=" /=:.,-")))
    with open(OUT, "w", encoding="utf-8") as f:
        f.write("".join(lines))
    print("written", os.path.relpath(OUT), "·", len(ICONS), "icons")


if __name__ == "__main__":
    sys.exit(main())
