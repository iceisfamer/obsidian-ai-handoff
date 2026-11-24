#!/usr/bin/env python3
"""Package only reviewed public files. Never archive the whole working tree."""
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parent.parent
manifest = json.loads((ROOT / 'manifest.json').read_text())
package = json.loads((ROOT / 'package.json').read_text())
versions = json.loads((ROOT / 'versions.json').read_text())
version = manifest['version']
assert re.fullmatch(r'\d+\.\d+\.\d+', version), 'Obsidian requires x.y.z'
assert package['version'] == version
assert manifest['author'] == 'cybrea'
assert manifest['isDesktopOnly'] is True
assert versions[version] == manifest['minAppVersion']
assert len(manifest['description']) <= 250 and manifest['description'].endswith('.')
assert len((ROOT / 'main.js').read_bytes()) > 1000, 'Build first'

runtime = ['main.js', 'manifest.json', 'styles.css']
docs = ['README.md', 'README.zh-CN.md', 'LICENSE', 'PRIVACY.md', 'CHANGELOG.md', 'VALIDATION.md', 'RELEASE_NOTES.md']
source_root = ['.gitignore', 'package.json', 'package-lock.json', 'tsconfig.json', 'eslint.config.mjs',
               'manifest.json', 'versions.json', 'styles.css', 'RELEASING.md'] + docs
source = [ROOT / name for name in source_root]
for folder in ['src', 'tests', 'scripts', '.github']:
    source.extend(p for p in (ROOT / folder).rglob('*') if p.is_file() and p.suffix != '.pyc' and '__pycache__' not in p.parts)
source = sorted(set(source))

# Catch accidental machine paths/credential artifacts in the publication allowlist.
for path in sorted(set(source + [ROOT / name for name in runtime])):
    assert not path.is_symlink(), f'Symlink not allowed: {path.name}'
    content = path.read_text()
    if path.suffix != '.py':  # This file intentionally contains the guard patterns.
        assert not re.search(r'/Users/|/home/[^/]+/|4/0A[A-Za-z0-9_-]{25,}|sk-[A-Za-z0-9_-]{24,}', content), f'Private path/token pattern: {path.name}'
    assert path.name not in {'data.json', 'auth.json', '.env'}, 'Private file in allowlist'

out = ROOT / 'dist' / version
out.mkdir(parents=True, exist_ok=True)
stage = Path(tempfile.mkdtemp(prefix='ai-handoff-release-'))
try:
    for name in runtime + ['RELEASE_NOTES.md']:
        shutil.copyfile(ROOT / name, stage / name)
    def write_zip(target, items):
        with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
            for path, name in items:
                info = zipfile.ZipInfo(name, date_time=(2026, 11, 24, 0, 0, 0))
                info.create_system = 3
                info.external_attr = (0o100755 if os.access(path, os.X_OK) else 0o100644) << 16
                info.compress_type = zipfile.ZIP_DEFLATED
                archive.writestr(info, path.read_bytes())
    install_zip = f'ai-handoff-{version}-macos.zip'
    source_zip = f'ai-handoff-{version}-source.zip'
    write_zip(stage / install_zip, [(ROOT / name, 'ai-handoff/' + name) for name in runtime + docs])
    write_zip(stage / source_zip, [(path, 'ai-handoff-source/' + path.relative_to(ROOT).as_posix()) for path in source])
    checksums = []
    for path in sorted(stage.iterdir()):
        checksums.append(hashlib.sha256(path.read_bytes()).hexdigest() + '  ' + path.name)
    (stage / 'SHA256SUMS.txt').write_text('\n'.join(checksums) + '\n')
    for path in stage.iterdir():
        shutil.copyfile(path, out / path.name)
finally:
    shutil.rmtree(stage)
print(f'Prepared {out.relative_to(ROOT)}:')
for path in sorted(out.iterdir()):
    print(f'  {path.name} ({path.stat().st_size:,} bytes)')
