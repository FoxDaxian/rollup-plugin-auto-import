import testPlugin from './plugin';
import typescript from '@rollup/plugin-typescript';

export default {
    input: './index.ts',
    output: {
        file: 'bundle.js',
        format: 'cjs',
        sourcemap: true,
    },
    plugins: [testPlugin(), typescript()],
};
