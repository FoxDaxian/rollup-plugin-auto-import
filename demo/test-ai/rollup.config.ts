import autoImport from 'rollup-plugin-auto-import';
import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';

export default {
    input: './a.ts',
    output: {
        dir: './dist',
        format: 'cjs',
        sourcemap: true,
    },
    plugins: [
        replace({
            preventAssignment: true,
            'process.env.NODE_ENV': JSON.stringify('production'),
        }),
        resolve(),
        autoImport({
            inject: {
                vue: ['ref'],
            },
        }),
        typescript({
            target: 'es5',
        }),
    ],
};
