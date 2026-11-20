from pathlib import Path
src=(Path(__file__).resolve().parent/'render_delivery.py').read_text(encoding='utf8')
exec(compile(src[:src.index("render('01_hero'")]+src[src.index('# One true 3D'):],'render_delivery.py','exec'))
