"""Optional, pinned asset preparation. Node build uses the committed derivatives.

Never changes the original artwork, TTF, license or logo. --check regenerates in
an isolated temporary directory and compares bytes without writing to assets/.
"""
import argparse
import hashlib
import importlib.metadata
import json
from pathlib import Path
import tempfile

from PIL import Image
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
VERSIONS = {"Pillow": "13.0.0", "fonttools": "4.67.0", "Brotli": "1.2.1"}
WIDTHS = {"identity": [480, 768], "manifesto": [480, 800, 1200]}


def digest(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()


def prepare(destination):
    manifest = json.loads((ASSETS / "manifest.json").read_text(encoding="utf-8"))
    generated = []
    for role, widths in WIDTHS.items():
        entry = manifest[role]
        with Image.open(ASSETS / entry["png"]) as original:
            assert original.size == (entry["width"], entry["height"])
            variants = []
            for width in widths:
                height = round(original.height * width / original.width)
                resized = original.resize((width, height), Image.Resampling.LANCZOS)
                file = f"{Path(entry['png']).stem}-{width}.webp"
                target = destination / file
                resized.save(target, "WEBP", lossless=True, method=6, exact=True,
                             icc_profile=original.info.get("icc_profile", b""))
                with Image.open(target) as decoded:
                    assert decoded.size == resized.size
                    assert decoded.convert("RGBA").tobytes() == resized.convert("RGBA").tobytes()
                variants.append({"file": file, "width": width, "height": height,
                                 "sha256": digest(target)})
                generated.append(file)
            entry["responsive"] = variants
    source = ASSETS / manifest["fonts"]["display"]["file"]
    assert digest(source) == manifest["fonts"]["display"]["sha256"]
    file = source.with_suffix(".woff2").name
    with TTFont(source, recalcTimestamp=False) as font:
        cmap, metrics, glyphs = font.getBestCmap(), dict(font["hmtx"].metrics), font.getGlyphOrder()
        font.flavor = "woff2"
        font.save(destination / file)
    with TTFont(destination / file) as decoded:
        assert decoded.getBestCmap() == cmap
        assert dict(decoded["hmtx"].metrics) == metrics
        assert decoded.getGlyphOrder() == glyphs
    manifest["fonts"]["display"]["woff2"] = {"file": file, "sha256": digest(destination / file)}
    generated.append(file)
    return manifest, generated


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    for name, expected in VERSIONS.items():
        if importlib.metadata.version(name) != expected:
            raise RuntimeError(f"Use scripts/requirements-assets.txt: {name}=={expected}")
    original_bytes = {p: p.read_bytes() for p in ASSETS.iterdir()
                      if p.is_file() and (p.suffix in [".png", ".jpg", ".ttf", ".txt"])}
    with tempfile.TemporaryDirectory(prefix="tu-gimnasio-assets-") as temporary:
        manifest, generated = prepare(Path(temporary))
        if args.check:
            assert manifest == json.loads((ASSETS / "manifest.json").read_text(encoding="utf-8"))
        for file in generated:
            data = (Path(temporary) / file).read_bytes()
            if args.check:
                assert (ASSETS / file).read_bytes() == data, f"Regenerate {file}"
            else:
                (ASSETS / file).write_bytes(data)
        if not args.check:
            (ASSETS / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    assert all(p.read_bytes() == value for p, value in original_bytes.items())
    print(json.dumps({"status": "verified", "mode": "check" if args.check else "prepare",
                      "files": [{"file": f, "bytes": (ASSETS / f).stat().st_size} for f in generated],
                      "originalsUnchanged": True, "fontGlyphsAndMetricsPreserved": True}))


if __name__ == "__main__":
    main()
