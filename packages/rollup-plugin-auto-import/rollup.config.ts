import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import pkg from './package.json';

const external = Object.keys(pkg.dependencies).concat([
    'path',
    'fs',
    'typescript',
]);

export default {
    input: './src/index.ts',
    output: [
        {
            file: pkg.main,
            format: 'cjs',
            exports: 'default',
        },
        {
            file: pkg.module,
            format: 'es',
        },
    ],
    external,
    plugins: [
        commonjs(),
        resolve(),
        typescript({
            target: 'es5',
            sourceMap: false,
        }),
    ],
};
