#!/usr/bin/env python3
"""
The World That Would Not Die - sprite sheet extraction tool.

Reads the official character sheet (READ-ONLY, the original is never modified)
and writes individual transparent PNGs + assets/sprites/manifest.json.

    python3 tools/extract_sprites.py [sheet.png] [out_dir]

Requires: Pillow, numpy, scipy.   (Dev-time only; the game itself needs no build step.)

Why bounding-box detection instead of a fixed grid: the sheet is not grid-aligned
(frame sizes and spacing vary), so each sprite is located by connected components
inside hand-specified row bands.  Re-running is idempotent.

Transparency: the sheet has a pure-black, fully opaque background and the player's
hair / the Guide's dress are also very dark.  Keying is therefore done by flood-fill
from the crop border through near-black pixels, NOT by deleting every dark pixel,
so dark interior pixels survive.
"""
import json, sys, os, shutil
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SHEET = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "assets/source/sprite_sheet.png")
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, "assets/sprites")

BG_LUM = 18        # pixels at/below this luminance, connected to the crop edge, are background
CONTENT_LUM = 20   # used for locating sprites
MARGIN = 6

img = Image.open(SHEET).convert("RGB")
rgb = np.array(img)
lum = rgb.astype(int).mean(axis=2)
content = lum > CONTENT_LUM


def find(x0, x1, y0, y1, it=3, minarea=1500):
    """Connected components inside a window -> [((x0,y0,x1,y1), mask)] sorted left->right.
    The mask lets cut() discard neighbouring sprites whose pixels overlap this sprite's bounding rectangle."""
    sub = ndi.binary_dilation(content[y0:y1, x0:x1], iterations=it)
    lab, _ = ndi.label(sub)
    hits = []
    for i, s in enumerate(ndi.find_objects(lab)):
        if (lab[s] == i + 1).sum() >= minarea:
            full = np.zeros(content.shape, bool)
            full[y0:y1, x0:x1] = ndi.binary_fill_holes(lab == i + 1)   # own pixels + halo; holes filled so
                                                                      # dark interiors can't drop out
            hits.append(((s[1].start + x0, s[0].start + y0, s[1].stop + x0, s[0].stop + y0), full))
    return sorted(hits, key=lambda h: h[0])



def trim_left_top(hit, frac=0.35):
    """Drop sparse noise columns/rows from the LEFT and TOP of a box (slivers of neighbouring art,
    label-text remnants). Right/bottom are left alone so detached expression marks ('!' '?') survive."""
    (x0, y0, x1, y1), mask = hit
    m = lum[y0:y1, x0:x1] > 70   # bright pixels only: slivers of neighbouring art are dim (~48)
    h, w = m.shape
    cols = m.mean(axis=0) >= frac
    rows = m.mean(axis=1) >= frac
    return ((x0 + int(np.argmax(cols)), y0 + int(np.argmax(rows)), x1, y1), mask)

def cut(hit, soft=True, clip=False, lumakey=False):
    """Crop with margin, key background to transparent by edge flood-fill, trim to content."""
    (x0, y0, x1, y1), mask = hit
    X0, Y0 = max(0, x0 - MARGIN), max(0, y0 - MARGIN)
    X1, Y1 = min(img.width, x1 + MARGIN), min(img.height, y1 + MARGIN)
    crop = rgb[Y0:Y1, X0:X1]
    dark = lum[Y0:Y1, X0:X1] <= BG_LUM
    lab, _ = ndi.label(dark)
    edge_labels = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bg = np.isin(lab, list(edge_labels))
    alpha = np.where(bg, 0, 255).astype(np.uint8)
    alpha[~mask[Y0:Y1, X0:X1]] = 0   # neighbouring sprites that overlap our rectangle
    if soft:  # 1px soft edge so outlines don't look chewed
        bg = bg | ~mask[Y0:Y1, X0:X1]
        ring = ndi.binary_dilation(bg, iterations=1) & ~bg
        l = lum[Y0:Y1, X0:X1]
        alpha[ring] = np.clip((l[ring] - BG_LUM) / 30.0 * 255, 0, 255).astype(np.uint8)
    if lumakey:  # glow/effect sprites: brightness -> opacity, so the dark haze becomes see-through
        l = lum[Y0:Y1, X0:X1]
        alpha = np.minimum(alpha, np.clip((l - 22) / 70.0 * 255, 0, 255).astype(np.uint8))
    if clip:  # hard-clip to the requested box so margin padding cannot re-admit trimmed noise
        alpha[:max(0, y0 - Y0), :] = 0
        alpha[:, :max(0, x0 - X0)] = 0
    rgba = np.dstack([crop, alpha])
    ys, xs = np.where(alpha > 0)
    t, b, l_, r = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    return Image.fromarray(rgba[t:b, l_:r], "RGBA"), (X0 + l_, Y0 + t)


manifest = {
    "source": "assets/source/sprite_sheet.png",
    "sheetSize": [img.width, img.height],
    "note": "Anchors are per-frame (x,y) in the frame's own pixel space; tweak freely, no re-extract needed "
            "unless sprites change. Player anchor = bottom-center (feet).",
    "player": {}, "guide": {"portraits": {}, "fullBody": [], "art": None}, "misc": {}, "ui": {},
}
os.makedirs(OUT, exist_ok=True)


def save(rel, im, src_xy, anchor="bottom-center"):
    path = os.path.join(OUT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path)
    w, h = im.size
    ax, ay = (w // 2, h) if anchor == "bottom-center" else (0, 0)
    return {"file": "assets/sprites/" + rel, "w": w, "h": h, "anchor": {"x": ax, "y": ay},
            "src": {"x": int(src_xy[0]), "y": int(src_xy[1]), "w": w, "h": h}}


# ---------------- PLAYER (row bands hand-specified from sheet inspection) ----------------
# name, y0, y1, xmax (xmax clips the Guide's hair so it is never picked up), expected frames, fps, loop
PLAYER_ROWS = [
    ("idle", 55, 165, 440, 4, 4, True),
    ("walk", 168, 272, 440, 5, 8, True),
    ("run", 280, 392, 437, 5, 12, True),
    ("jump", 392, 512, 380, 4, 8, False),
    ("fall", 514, 612, 380, 4, 8, True),
    ("hurt", 618, 730, 380, 3, 6, False),
    ("death", 736, 850, 400, 4, 6, False),
]
for name, y0, y1, xmax, expect, fps, loop in PLAYER_ROWS:
    boxes = find(76, xmax, y0, y1)
    assert len(boxes) == expect, f"{name}: expected {expect} frames, found {len(boxes)}"
    frames = []
    for i, b in enumerate(boxes):
        im, xy = cut(b)
        frames.append(save(f"player/{name}_{i}.png", im, xy))
    manifest["player"][name] = {"fps": fps, "loop": loop, "frames": frames}

# ---------------- GUIDE PORTRAITS (4 x 3 grid) ----------------
PORTRAIT_NAMES = [["normal", "smug", "laugh", "teasing"],
                  ["serious", "annoyed", "surprised", "bothered"],
                  ["sad", "blush", "shocked", "confused"]]
# NOTE: the large Guide illustration ends at x~841, only ~5px from the portrait grid (x~846),
# so the window must start at 844 or its edge is captured.  Row 1 starts at y=70 to skip label text.
PORTRAIT_BANDS = [(70, 248, 844), (264, 440, 846), (456, 632, 846)]   # (y0, y1, xmin) - rows 2-3 sit right
PORTRAIT_XMAX = 1535                                                  # beside the big art's edge (x<=845)
for row, (y0, y1, xmin) in enumerate(PORTRAIT_BANDS):
    boxes = find(xmin, PORTRAIT_XMAX, y0, y1, it=3, minarea=8000)
    assert len(boxes) == 4, f"portrait row {row}: found {len(boxes)}"
    for col, b in enumerate(boxes):
        im, xy = cut(trim_left_top(b), clip=True)
        manifest["guide"]["portraits"][PORTRAIT_NAMES[row][col]] = save(
            f"guide/portraits/{PORTRAIT_NAMES[row][col]}.png", im, xy, anchor="top-left")

# ---------------- GUIDE LARGE ART + FULL BODY POSES ----------------
big = find(385, 842, 30, 645, it=3, minarea=8000)   # art ends at x~841; 842+ is portrait-column noise
assert len(big) == 1
im, xy = cut(big[0])
manifest["guide"]["art"] = save("guide/art_large.png", im, xy)

poses = find(430, 1090, 660, 1000, it=5, minarea=5000)
assert len(poses) == 4, f"full body: found {len(poses)}"
for i, b in enumerate(poses):
    im, xy = cut(b)
    manifest["guide"]["fullBody"].append(save(f"guide/body_{i}.png", im, xy))

# ---------------- MISC ROW ----------------
MISC_NAMES = ["guide_head_peek", "player_back", "spikes", "portal_ring"]
misc = find(76, 400, 880, 975)
assert len(misc) == 4, f"misc: found {len(misc)}"
for n, b in zip(MISC_NAMES, misc):
    im, xy = cut(b, lumakey=(n == "portal_ring"))   # ring's source art has a dark glow haze
    manifest["misc"][n] = save(f"misc/{n}.png", im, xy)

# ---------------- UI REFERENCE ART (kept as-is, no keying) ----------------
ui = {"face_closeup": (1117, 670, 1503, 856), "dialogue_reference": (1090, 864, 1518, 1000)}
for n, (x0, y0, x1, y1) in ui.items():
    crop = img.crop((x0, y0, x1, y1))
    os.makedirs(os.path.join(OUT, "ui"), exist_ok=True)
    crop.save(os.path.join(OUT, "ui", n + ".png"))
    manifest["ui"][n] = {"file": f"assets/sprites/ui/{n}.png", "w": crop.width, "h": crop.height}

with open(os.path.join(OUT, "manifest.json"), "w") as f:
    json.dump(manifest, f, indent=1)

n_files = sum(len(r["frames"]) for r in manifest["player"].values()) + 12 + 1 + 4 + 4 + 2
print(f"OK - wrote {n_files} sprites + manifest.json to {OUT}")
