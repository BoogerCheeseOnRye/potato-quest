// Production build: writes a dev-free site into docs/ for GitHub Pages.
//
//   node tools/build.mjs           build docs/
//   node tools/build.mjs --check   verify docs/ has no dev files, then exit
//
// The showcase (dev.html + src/dev/) must never reach players. This script is
// the only supported way to publish, and it refuses to finish if a dev file or
// a reference to one ends up in docs/.
import { rm, mkdir, cp, readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
const OUT = join(ROOT, 'docs');
const CHECK_ONLY = process.argv.includes('--check');

const SKIP_DIRS = new Set(['dev']);
const SKIP_FILES = new Set(['dev.html']);

// Anything matching these in docs/ means the showcase leaked.
const FORBIDDEN = [/dev\.html/, /src\/dev\//, /dev\/showcase\.js/];

async function copyTree(from, to, rel = '') {
  await mkdir(to, { recursive: true });
  for (const entry of await readdir(from, { withFileTypes: true })) {
    const relPath = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) {
        console.log(`  skip  ${relPath}/`);
        continue;
      }
      await copyTree(join(from, entry.name), join(to, entry.name), relPath);
    } else if (entry.isFile()) {
      if (SKIP_FILES.has(entry.name)) {
        console.log(`  skip  ${relPath}`);
        continue;
      }
      await cp(join(from, entry.name), join(to, entry.name));
      console.log(`  copy  ${relPath}`);
    }
  }
}

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(p));
    else out.push(p);
  }
  return out;
}

async function check() {
  const errors = [];
  let exists = true;
  try { await stat(OUT); } catch { exists = false; }
  if (!exists) {
    console.error('docs/ does not exist — run `node tools/build.mjs` first.');
    process.exit(1);
  }
  const files = await walk(OUT);
  for (const f of files) {
    const rel = relative(OUT, f);
    for (const bad of FORBIDDEN) {
      if (bad.test(rel)) errors.push(`forbidden file: ${rel}`);
    }
    if (!/\.(html|js|css|json|txt|md|svg|png|webmanifest)$/i.test(rel)) continue;
    const text = await readFile(f, 'utf8');
    for (const bad of FORBIDDEN) {
      if (bad.test(text)) errors.push(`${rel} references ${bad}`);
    }
  }
  if (errors.length) {
    console.error('BUILD IS NOT SAFE TO SHIP:');
    for (const e of errors) console.error('  ✗ ' + e);
    process.exit(1);
  }
  console.log(`docs/ is clean: ${files.length} files, no dev showcase.`);
}

if (CHECK_ONLY) {
  await check();
} else {
  console.log('building docs/ (production, dev excluded)');
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });
  await cp(join(ROOT, 'index.html'), join(OUT, 'index.html'));
  console.log('  copy  index.html');
  await copyTree(join(ROOT, 'css'), join(OUT, 'css'), 'css');
  await copyTree(join(ROOT, 'src'), join(OUT, 'src'), 'src');
  // GitHub Pages serves /docs as a plain static site; .nojekyll skips Jekyll.
  await writeFile(join(OUT, '.nojekyll'), '');
  console.log('  write .nojekyll');
  await check();
  console.log('done. publish docs/ (e.g. GitHub Pages, branch main, folder /docs).');
}
