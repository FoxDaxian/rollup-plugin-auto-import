import { createFilter, FilterPattern } from '@rollup/pluginutils';
import { FileLoader, defaultFlag } from './fileLoader';
import { relative, dirname } from 'path';
import { walk } from 'estree-walker';
import MagicString from 'magic-string';
import chokidar from 'chokidar';
import { Options } from '../';

interface Node {
    name: string;
    type: string;
}

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/export
// 这里是export的相关语法
// 比如as语法还不支持

export default function (options: Options) {
    options = options || {};
    const presetDir = options.presetDir || 'auto-import';
    const inject = options.inject || {};
    const filter = createFilter(options.include, options.exclude);
    const fileLoader = new FileLoader(presetDir, inject);
    fileLoader.generateDtsFromPreset();
    dtsWatch(presetDir, fileLoader);

    return {
        name: 'auto-import-plugin',
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

function _transform(code: string, id: string, fileLoader: FileLoader) {
    const importStatements = new Map<string, string[]>();

    // @ts-ignore
    const ast = this.parse(code);
    walk(ast, {
        enter(node, parent, prop, index) {
            if (node.type === 'Identifier') {
                const name = (node as Node).name;
                if (fileLoader.importCtx.has(name)) {
                    const fullpath = fileLoader.importCtx.get(name)!;
                    importStatements.set(fullpath, [
                        ...(importStatements.get(fullpath) || []),
                        name,
                    ]);
                }
                if (fileLoader.importCtx.has(defaultFlag + name)) {
                    const fullpath = fileLoader.importCtx.get(
                        defaultFlag + name
                    )!;
                    importStatements.set(fullpath, [
                        ...(importStatements.get(fullpath) || []),
                        defaultFlag + name,
                    ]);
                }
            }
        },
    });
    let res = '';
    for (const [fullpath, modules] of importStatements) {
        const source = relative(dirname(id), fullpath);
        const importDefaultName = [];
        const importSpecifiersName = [];
        for (const module of modules) {
            if (module.startsWith(defaultFlag)) {
                importDefaultName.push(module.replace(defaultFlag, ''));
            } else {
                importSpecifiersName.push(module);
            }
        }
        if (importSpecifiersName.length) {
            res += `import { ${importSpecifiersName.join(
                ', '
            )} } from '${source}';\n`;
        }
        if (importDefaultName.length) {
            res += `import ${importDefaultName[0]} from '${source}';\n`;
        }
    }
    const s = new MagicString(code);
    s.prependLeft(0, res);
    return {
        code: s.toString(),
        map: s.generateMap(),
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
