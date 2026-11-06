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

from PIL import Image, ImageOps
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
VERSIONS = {"Pillow": "13.0.0", "fonttools": "4.67.0", "Brotli": "1.2.1"}
WIDTHS = {"identity": [480, 768], "manifesto": [480, 800, 1200], "brand": [160, 320, 480, 768, 1080]}
# Roles whose full-size WebP is also derived here (lossless, verified pixel by pixel).
FULL_WEBP = {"brand"}

# Real photos of the venue (received 06/11/2026). Originals stay untouched in the project's
# materials folder, outside this repository; only cropped, metadata-free derivatives ship.
# Photos use lossy encodings (lossless photos would be several times heavier).
PHOTO_SOURCE = ROOT.parent / "materiales" / "fotos-sede-2026-11" / "originales"
PHOTOS = {
    # role: (output stem, source file, crop box (left, top, right, bottom), responsive widths)
    "facadeDay": ("tu-gimnasio-sede-fachada-dia", "WhatsApp Image 2026-11-06 at 12.14.39.jpeg", (0, 270, 960, 990), [480, 720]),
    "facadeNight": ("tu-gimnasio-sede-fachada-noche", "WhatsApp Image 2026-11-06 at 12.10.29.jpeg", (0, 330, 960, 1050), [320, 480]),
    "photoMusculacion": ("tu-gimnasio-sede-musculacion", "WhatsApp Image 2026-11-06 at 12.11.54 (2).jpeg", (0, 330, 960, 1050), [480, 720]),
    "photoSpinning": ("tu-gimnasio-sede-spinning", "WhatsApp Image 2026-11-06 at 12.13.20.jpeg", (0, 380, 960, 1100), [480, 720]),
    "photoGimnasiaGrupal": ("tu-gimnasio-sede-salon-steps", "WhatsApp Image 2026-11-06 at 12.13.20 (1).jpeg", (520, 190, 1280, 760), [480]),
    "photoPilates": ("tu-gimnasio-sede-salon", "WhatsApp Image 2026-11-06 at 12.13.20 (1).jpeg", (0, 0, 1280, 960), [480, 720, 960]),
}
PHOTO_WEBP_QUALITY = 78
PHOTO_JPEG_QUALITY = 82


def digest(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()


def prepare_photos(manifest, destination, generated):
    """Crop, strip metadata and encode each venue photo; never touches the originals."""
    for role, (stem, source_name, box, widths) in PHOTOS.items():
        source = PHOTO_SOURCE / source_name
        if not source.is_file():
            raise FileNotFoundError(f"Falta el original de {role}: {source}")
        with Image.open(source) as opened:
            original = ImageOps.exif_transpose(opened).convert("RGB")
        cropped = original.crop(box)
        entry = manifest.setdefault(role, {})
        entry.update({
            "jpeg": f"{stem}.jpg", "webp": f"{stem}.webp",
            "width": cropped.width, "height": cropped.height,
            "source": f"materiales/fotos-sede-2026-11/originales/{source_name}",
            "sourceSha256": digest(source), "crop": list(box),
        })
        # No exif/icc arguments: the outputs carry no camera or location metadata.
        cropped.save(destination / entry["jpeg"], "JPEG", quality=PHOTO_JPEG_QUALITY,
                     optimize=True, progressive=True)
        cropped.save(destination / entry["webp"], "WEBP", quality=PHOTO_WEBP_QUALITY, method=6)
        entry["sha256"] = digest(destination / entry["jpeg"])
        entry["webpSha256"] = digest(destination / entry["webp"])
        generated += [entry["jpeg"], entry["webp"]]
        variants = []
        for width in widths:
            height = round(cropped.height * width / cropped.width)
            file = f"{stem}-{width}.webp"
            cropped.resize((width, height), Image.Resampling.LANCZOS).save(
                destination / file, "WEBP", quality=PHOTO_WEBP_QUALITY, method=6)
            with Image.open(destination / file) as decoded:
                assert decoded.size == (width, height) and not decoded.info.get("exif")
            variants.append({"file": file, "width": width, "height": height,
                             "sha256": digest(destination / file)})
            generated.append(file)
        entry["responsive"] = variants


def prepare(destination):
    manifest = json.loads((ASSETS / "manifest.json").read_text(encoding="utf-8"))
    generated = []
    prepare_photos(manifest, destination, generated)
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
            if role in FULL_WEBP:
                target = destination / entry["webp"]
                original.save(target, "WEBP", lossless=True, method=6, exact=True,
                              icc_profile=original.info.get("icc_profile", b""))
                with Image.open(target) as decoded:
                    assert decoded.convert("RGBA").tobytes() == original.convert("RGBA").tobytes()
                entry["webpSha256"] = digest(target)
                generated.append(entry["webp"])
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
    derived_photos = {f"{stem}.jpg" for stem, *_ in PHOTOS.values()}
    original_bytes = {p: p.read_bytes() for p in ASSETS.iterdir()
                      if p.is_file() and p.suffix in [".png", ".jpg", ".ttf", ".txt"]
                      and p.name not in derived_photos}
    photo_sources = {p: p.read_bytes() for p in PHOTO_SOURCE.iterdir() if p.is_file()}
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
    assert all(p.read_bytes() == value for p, value in photo_sources.items())
    print(json.dumps({"status": "verified", "mode": "check" if args.check else "prepare",
                      "files": [{"file": f, "bytes": (ASSETS / f).stat().st_size} for f in generated],
                      "originalsUnchanged": True, "fontGlyphsAndMetricsPreserved": True}))


if __name__ == "__main__":
    main()
