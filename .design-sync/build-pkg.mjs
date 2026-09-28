// Stages the design-system layer (apps/web/src/shared/design-system) as a package the
// design-sync converter can read. The layer is source inside the web app, with no dist,
// .d.ts tree or compiled stylesheet of its own, so this writes one to .ds-pkg/ (gitignored):
//
//   package.json      names the package and points at the two files below
//   dist/index.js     re-exports the layer's public surface (index.ts); the converter bundles it
//   types/            the layer's declarations, emitted by tsc from the app's own tsconfig
//   styles.css        tokens/tailwind.css compiled by Tailwind, plus the utility vocabulary
//                     designs compose with (.design-sync/tailwind-sync.css)
//   fonts/            the IBM Plex Sans Arabic files styles.css references
//
// Run from the repo root, after `npm ci` and after the converter's deps are staged in .ds-sync/
// (NOTES.md): node .design-sync/build-pkg.mjs
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { basename, dirname, join, relative, resolve } from 'node:path';

const LAYER = resolve('apps/web/src/shared/design-system');
const OUT = resolve('.ds-pkg');
const posix = (p) => p.split('\\').join('/');
const rel = (from, to) => {
  const r = posix(relative(from, to));
  return r.startsWith('.') ? r : `./${r}`;
};

if (!existsSync(join(LAYER, 'index.ts'))) {
  console.error(`build-pkg: ${LAYER}/index.ts not found; run from the repo root`);
  process.exit(1);
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, 'dist'), { recursive: true });

writeFileSync(
  join(OUT, 'package.json'),
  `${JSON.stringify(
    {
      name: '@masaha/design-system',
      version: '0.0.0',
      private: true,
      type: 'module',
      module: 'dist/index.js',
      types: 'types/index.d.ts',
    },
    null,
    2,
  )}\n`,
);

// The JS entry. The converter's esbuild bundles the TypeScript source straight from the layer.
writeFileSync(
  join(OUT, 'dist', 'index.js'),
  `export * from '${rel(join(OUT, 'dist'), join(LAYER, 'index.ts'))}';\n`,
);

// Declarations, from the app's compiler options so the types match what the app checks.
writeFileSync(
  join(OUT, 'tsconfig.json'),
  `${JSON.stringify(
    {
      extends: rel(OUT, resolve('apps/web/tsconfig.app.json')),
      compilerOptions: {
        noEmit: false,
        declaration: true,
        emitDeclarationOnly: true,
        declarationDir: './types',
        rootDir: rel(OUT, LAYER),
        tsBuildInfoFile: null,
        incremental: false,
        types: [],
      },
      // Only the public surface and what it imports; the app's own `include` would pull in all of src/.
      files: [rel(OUT, join(LAYER, 'index.ts'))],
      include: [],
    },
    null,
    2,
  )}\n`,
);
const tsc = createRequire(resolve('package.json')).resolve('typescript/bin/tsc');
execFileSync(process.execPath, [tsc, '-p', join(OUT, 'tsconfig.json')], { stdio: 'inherit' });

// The stylesheet, compiled by the Tailwind CLI staged in .ds-sync/ (pinned to the repo's tailwindcss).
const cli = resolve('.ds-sync/node_modules/@tailwindcss/cli/dist/index.mjs');
if (!existsSync(cli)) {
  console.error(
    'build-pkg: @tailwindcss/cli is not staged in .ds-sync/ (see .design-sync/NOTES.md)',
  );
  process.exit(1);
}
execFileSync(
  process.execPath,
  [cli, '-i', resolve('.design-sync/tailwind-sync.css'), '-o', join(OUT, 'styles.css')],
  {
    stdio: 'inherit',
  },
);

// Point every font url() at a copy under .ds-pkg/fonts/, wherever the CLI left the path, so the
// converter (which only copies files inside the package) ships them.
const fontsDir = dirname(
  createRequire(join(LAYER, 'tokens', 'typography.css')).resolve(
    '@fontsource/ibm-plex-sans-arabic/400.css',
  ),
);
mkdirSync(join(OUT, 'fonts'), { recursive: true });
let copied = 0;
const css = readFileSync(join(OUT, 'styles.css'), 'utf8').replace(
  /url\((['"]?)([^'")]*ibm-plex-sans-arabic[^'")]*\.woff2?)\1\)/g,
  (_, quote, url) => {
    const file = basename(url);
    const source = join(fontsDir, 'files', file);
    if (!existsSync(source)) {
      console.error(`build-pkg: font ${file} not found in ${fontsDir}/files`);
      process.exit(1);
    }
    if (!existsSync(join(OUT, 'fonts', file))) {
      copyFileSync(source, join(OUT, 'fonts', file));
      copied += 1;
    }
    return `url(${quote}./fonts/${file}${quote})`;
  },
);
writeFileSync(join(OUT, 'styles.css'), css);

console.error(`build-pkg: staged ${posix(relative(process.cwd(), OUT))}/ (${copied} font files)`);
