import { createFilter } from '@rollup/pluginutils';
import { FileLoader } from './fileLoader';
import chokidar from 'chokidar';
import { Options } from '../';
import _transform from './transform';

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/export
// 这里是export的相关语法
// 比如as语法还不支持

const defualtExclude = [/node_modules/, /\.css\b/];
const defaultPresetDir = 'auto-import';

export default function (options: Options) {
    options = options || {};
    const presetDir = options.presetDir || defaultPresetDir;
    const inject = options.inject || {};
    const exclude = options.exclude ? options.exclude instanceof Array ? [...defualtExclude, ...options.exclude] : [...defualtExclude, options.exclude] : defualtExclude;
    const filter = createFilter(options.include, exclude);
    const fileLoader = new FileLoader(presetDir, inject);
    fileLoader.generateDtsFromPreset();
    let watched = true;
    if (process.env.NODE_ENV !== 'production') {
        watched = false;
        dtsWatch(presetDir, fileLoader);
    }
    

    return {
        name: 'auto-import-plugin',
        buildStart() {
            if (!watched) {
                // @ts-ignore
                this.addWatchFile(presetDir); // cause page reload, need to resolved   
                watched = true;
            }
        },
        transform(code: string, id: string) {
            if (!filter(id)) {
                return null;
            }
            for (const file of fileLoader.ignoreFiles.values()) {
                if (typeof file === 'string' && file === id) {
                    return null;
                }
                if (file instanceof RegExp && file.exec(id)) {
                    return null;
                }
            }
            return _transform.call(this, code, id, fileLoader);
        },
    };
}

function dtsWatch(presetDir: string, fileLoader: FileLoader) {
    let timer: NodeJS.Timeout;
    chokidar.watch(presetDir).on('all', (event, path) => {
        timer && clearTimeout(timer);
        timer = setTimeout(function () {
            fileLoader.generateDtsFromPreset();
        }, 50);
    });
}
