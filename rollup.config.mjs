import ts from '@rollup/plugin-typescript'
import json from '@rollup/plugin-json'
import terser from '@rollup/plugin-terser'
import nodeResolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'

export default {
  input: 'src/index.ts',
  output: {
    file: 'lib/index.cjs',
    format: 'cjs',
    banner: '#!/usr/bin/env node',
    inlineDynamicImports: true,
  },
  plugins: [
    commonjs(),
    ts(),
    json(),
    terser(),
    nodeResolve({
      exportConditions: ['node', 'default', 'module', 'import'],
      browser: false,
    }),
  ],
}
