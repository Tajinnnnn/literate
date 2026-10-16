"""Create an inspectable store candidate; never claim legal/store approval."""
from pathlib import Path
import hashlib
import json
import re
import runpy
import zipfile

root = Path(__file__).resolve().parents[1]
runpy.run_path(str(root / 'utils/package-release.py'))
manifest = json.loads((root / 'build/manifest.json').read_text())
version = manifest['version']
asset_audit = json.loads((root / 'build/runtime-assets.json').read_text())
assert asset_audit['forbiddenBrowserModules'] == [], 'Node/development-only packages must not ship in browser bundles'
assert manifest['manifest_version'] == 3
assert len(manifest['description']) <= 132
assert version == json.loads((root / 'package.json').read_text())['version']
assert not manifest.get('web_accessible_resources'), 'Re-audit any publicly exposed runtime assets'
assert set(manifest['permissions']) == {'storage', 'contextMenus', 'webNavigation', 'offscreen'}
assert set(manifest['host_permissions']) == {'https://huggingface.co/*', 'https://*.hf.co/*'}
assert "worker-src 'self';" in manifest['content_security_policy']['extension_pages'], 'Workers must use Chrome-compatible bundled sources'
assert 'unsafe-eval' not in manifest['content_security_policy']['extension_pages'].replace('wasm-unsafe-eval', '')

source = root / f'releases/literate-{version}-standalone-beta.zip'
output = root / f'releases/literate-{version}-store-candidate.zip'
with zipfile.ZipFile(source) as candidate:
    names = set(candidate.namelist())
    # Runtime roots plus the PDF worker chunk emitted by webpack. Include only
    # hashed image assets actually referenced by these files, never old build debris.
    keep = {n for n in names if n.endswith(('.html', '.bundle.js', '.wasm', '.mjs'))}
    keep |= {'manifest.json', 'logo.svg', 'LICENSE', 'PRIVACY.md', 'THIRD_PARTY_NOTICES.txt'}
    keep |= {n for n in names if n.startswith(('licenses/', 'icon-'))}
    for name in list(keep):
        if name.endswith(('.html', '.js', '.mjs', '.css')):
            text = candidate.read(name).decode('utf-8')
            for asset in re.findall(r'[A-Za-z0-9_.-]+\.(?:png|svg|wasm|mjs|css)', text):
                if asset in names:
                    keep.add(asset)
    keep.add('content.styles.css')
    keep.add('DISTRIBUTION.md')
    with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as archive:
        for name in sorted(keep):
            archive.writestr(name, candidate.read(name))
with zipfile.ZipFile(output) as archive:
    assert archive.testzip() is None
    names = set(archive.namelist())
    required = [manifest['background']['service_worker'], manifest['action']['default_popup']]
    required += list(manifest['icons'].values())
    for script in manifest['content_scripts']:
        required += script.get('js', []) + script.get('css', [])
    for name in names:
        assert not name.startswith('/') and '..' not in Path(name).parts
        assert not any(part.startswith('.') for part in Path(name).parts)
        assert not name.endswith('.map') and 'voice-check' not in name and name != '744.bundle.js'
        if name.endswith('.html'):
            html = archive.read(name).decode()
            for ref in re.findall(r'(?:src|href)=["\']([^"\']+)["\']', html):
                assert not ref.startswith(('http:', 'https:')), f'Remote HTML asset: {ref}'
                required.append(ref.lstrip('/').split('?')[0])
    assert set(required) <= names, f'Missing entry assets: {set(required) - names}'
report = {
    'version': version, 'file': output.name,
    'sha256': hashlib.sha256(output.read_bytes()).hexdigest(),
    'bytes': output.stat().st_size, 'files': sorted(names),
    'excluded_node_dependencies': asset_audit['excludedNodeDependencies'],
    'checks': ['ZIP integrity', 'root MV3 manifest', 'manifest entry assets and HTML scripts',
               'description length', 'version consistency', 'permission allowlist',
               'no public runtime resources', 'no remote HTML scripts', 'no debug/source-map assets', 'browser module graph excludes Node/dev-only advisory paths'],
    'submission_ready': False,
    'remaining_gates': ['embedded eSpeak NG license/source obligations', 'fresh-profile and Windows acceptance',
                        'cold-load network audit', 'publisher account and dashboard declarations'],
}
output.with_suffix('.report.json').write_text(json.dumps(report, indent=2) + '\n')
print(f'{output}\nSHA-256: {report["sha256"]}\nPackaging checks passed; submission gates remain (store/README.md).')
