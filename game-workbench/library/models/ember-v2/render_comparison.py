from pathlib import Path
p=Path(__file__).with_name('render_delivery.py')
source=p.read_text(encoding='utf8')
exec(compile(source[:source.index("render('01_hero'")]+source[source.index('# Compare actual'):],str(p),'exec'))
