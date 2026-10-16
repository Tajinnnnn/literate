"""Package only Literate runtime assets, never stale/debug pages from build/."""
from pathlib import Path
import json
import re
import zipfile

root = Path(__file__).resolve().parents[1]
build = root / 'build'
required = ['manifest.json', 'background.bundle.js', 'popup.html', 'popup.bundle.js', 'contentScript.bundle.js', 'content.styles.css', 'pdfviewer.html', 'pdfviewer.bundle.js', 'voice-host.html', 'voiceHost.bundle.js', 'voiceWorker.bundle.js', 'ort-wasm-simd-threaded.jsep.mjs', 'ort-wasm-simd-threaded.jsep.wasm', 'icon-16.png', 'icon-32.png', 'icon-34.png', 'icon-48.png', 'icon-128.png', 'logo.svg']
for name in required:
    if not (build / name).is_file():
        raise SystemExit(f'Build asset missing: {name}')
manifest = json.loads((build / 'manifest.json').read_text())
files = {build / name for name in required}
# Only assets from the current compilation, including its actual PDF worker chunk.
# Numeric chunk ids change after dependency updates; never hardcode one.
current = json.loads((build / 'runtime-assets.json').read_text())['files']
for name in current:
    if re.fullmatch(r'[0-9]+\.bundle\.js', name) or Path(name).suffix in ('.wasm', '.mjs', '.svg', '.png'):
        path = build / name
        if path.parent != build or not path.is_file():
            raise SystemExit(f'Invalid runtime asset: {name}')
        files.add(path)
release = root / 'releases'
release.mkdir(exist_ok=True)
output = release / f'literate-{manifest["version"]}-standalone-beta.zip'
with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as archive:
    for path in sorted(files):
        archive.write(path, path.name)
    for name in ('LICENSE', 'DISTRIBUTION.md', 'PRIVACY.md'):
        archive.write(root / name, name)
    lock = json.loads((root / 'package-lock.json').read_text())
    notices = []
    for relative, meta in lock['packages'].items():
        if not relative or meta.get('dev'):
            continue
        folder = root / relative
        package_file = folder / 'package.json'
        if not package_file.exists():
            continue
        package = json.loads(package_file.read_text())
        name = package.get('name', relative)
        notices.append(f'{name} {package.get("version", "")} — {package.get("license", "See upstream license")}')
        for file in folder.iterdir():
            if file.is_file() and file.name.lower().startswith(('license', 'licence', 'copying', 'notice')):
                archive.write(file, f'licenses/{relative.replace("node_modules/", "")}/{file.name}')
    archive.writestr('THIRD_PARTY_NOTICES.txt', '\n'.join(sorted(notices)) + '\n\nModel: Kokoro-82M v1.0, Apache-2.0; downloaded separately from Hugging Face.\nSee DISTRIBUTION.md for public-release review requirements.\n')
with zipfile.ZipFile(output) as archive:
    assert archive.testzip() is None
    assert set(required) <= set(archive.namelist())
    assert not any('voice-check' in name or name == '744.bundle.js' for name in archive.namelist())
print(f'{output}\n{output.stat().st_size / 1024 / 1024:.1f} MiB; runtime files and ZIP integrity verified')
