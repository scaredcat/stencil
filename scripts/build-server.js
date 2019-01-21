const fs = require('fs-extra');
const path = require('path');
const rollup = require('rollup');
const rollupResolve = require('rollup-plugin-node-resolve');
const rollupCommonjs = require('rollup-plugin-commonjs');
const { transpile } = require('./script-utils');

const TRANSPILED_DIR = path.join(__dirname, '..', 'dist', 'transpiled-server');
const ENTRY_FILE = path.join(TRANSPILED_DIR, 'server', 'index.js');
const DEST_DIR = path.join(__dirname, '..', 'dist', 'server');
const DEST_FILE = path.join(DEST_DIR, 'index.js');


const success = transpile(path.join('..', 'src', 'server', 'tsconfig.json'));

if (success) {

  async function bundleServer() {
    const rollupBuild = await rollup.rollup({
      input: ENTRY_FILE,
      external: [
        'assert',
        'buffer',
        'crypto',
        'fs',
        'module',
        'os',
        'path',
        'child_process',
        '../compiler',
        '../mock-doc',
        '../runtime',
      ],
      plugins: [
        (() => {
          return {
            resolveId(id) {
              if (id === '@stencil/core/build-conditionals') {
                return '../compiler';
              }
              if (id === '@mock-doc') {
                return '../mock-doc';
              }
              if (id === '@stencil/core/runtime') {
                return '../runtime';
              }
            }
          }
        })(),
        rollupResolve({
          preferBuiltins: true
        }),
        rollupCommonjs()
      ],
      onwarn: (message) => {
        if (/top level of an ES module/.test(message)) return;
        console.error(message);
      }
    });

    // copy over all the .d.ts file too
    await fs.copy(path.dirname(ENTRY_FILE), DEST_DIR, {
      filter: (src) => {
        return src.indexOf('.js') === -1 && src.indexOf('.spec.') === -1;
      }
    });

    await rollupBuild.write({
      format: 'cjs',
      file: DEST_FILE
    });
  }

  await bundleServer();

  process.on('exit', () => {
    fs.removeSync(TRANSPILED_DIR);
    console.log(`✅  server`);
  });

} else {
  console.log(`❌  server`);
}
