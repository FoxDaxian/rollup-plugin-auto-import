import autoImport from 'rollup-plugin-auto-import';
import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import { rollup, watch } from 'rollup';

// see below for details on the options
const inputOptions = {
    input: './a.ts',

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
const outputOptions = { dir: './dist', format: 'cjs', sourcemap: true };
inputOptions.output = outputOptions;

async function build() {
    // create a bundle
    // const bundle = await rollup(inputOptions);

    // // generate output specific code in-memory
    // // you can call this function multiple times on the same bundle object
    // await bundle.generate(outputOptions);

    // // or write the bundle to disk
    // await bundle.write(outputOptions);

    // // closes the bundle
    // await bundle.close();

    const watcher = watch(inputOptions);

    watcher.on('event', (event) => {
        if (event.code === 'ERROR') {
            console.log(event);
        }
        console.log(`Rollup watcher event code: ${event.code}`);
    });
}

build();
