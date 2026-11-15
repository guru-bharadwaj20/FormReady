import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { configureWasm } from '$lib/codec/jsquash';

const require = createRequire(import.meta.url);
const pkgDir = (name: string) => dirname(require.resolve(`${name}/package.json`));

const files = {
  'jpeg-enc': join(pkgDir('@jsquash/jpeg'), 'codec/enc/mozjpeg_enc.wasm'),
  'jpeg-dec': join(pkgDir('@jsquash/jpeg'), 'codec/dec/mozjpeg_dec.wasm'),
  png: join(pkgDir('@jsquash/png'), 'codec/pkg/squoosh_png_bg.wasm'),
} as const;

const cache = new Map<string, Promise<WebAssembly.Module>>();

/** Node has no fetch for file URLs, so hand jSquash precompiled modules. */
configureWasm((name) => {
  let p = cache.get(name);
  if (!p) {
    p = readFile(files[name]).then((buf) => WebAssembly.compile(buf));
    cache.set(name, p);
  }
  return p;
});
