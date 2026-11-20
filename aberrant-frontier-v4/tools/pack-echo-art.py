"""Encode the workbench originals for the self-contained expedition build."""
import json
from pathlib import Path

from PIL import Image

project = Path(__file__).resolve().parents[1]
library = project.parent / "game-workbench" / "library" / "echo-art"
assets = json.loads((library / "manifest.json").read_text(encoding="utf-8"))["assets"]
limits = {"weapons": 256, "skills": 256, "talents": 192, "regions": 1080, "creatures": 480, "bosses": 640}
for asset in assets:
    source = library / asset["source"]
    target = project / "dist" / "assets" / f"echo-{asset['id']}.webp"
    with Image.open(source) as image:
        if asset["transparent"] and ("A" not in image.getbands() or image.getchannel("A").getextrema()[0] != 0):
            raise ValueError(f"{source.name} needs a transparent background")
        size = limits[asset["group"]]
        image.thumbnail((size, size), Image.Resampling.LANCZOS)
        image.save(target, quality=88, method=6)
print(f"Packed {len(assets)} expedition illustrations")
