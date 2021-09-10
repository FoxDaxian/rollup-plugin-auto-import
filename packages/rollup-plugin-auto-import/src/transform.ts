import { Node } from './type/node';
import { relative, dirname, sep } from 'path';
import { walk } from 'estree-walker';
import MagicString from 'magic-string';
import { FileLoader, defaultFlag } from './fileLoader';

export default function (code: string, id: string, fileLoader: FileLoader) {
    const importStatements = new Map<string, string[]>();
    const alreadyDeclaration = new Set<string>();

    // @ts-ignore
    const ast = this.parse(code);
    walk(ast, {
        enter(node, parent, prop, index) {
            if (node.type === 'Identifier') {
                const name = (node as Node).name;
                switch (parent.type) {
                    case 'VariableDeclarator': // let const var
                    case 'FunctionDeclaration': // function async function
                    case 'ImportNamespaceSpecifier': // import * as test from 'vue';
                    case 'ImportDefaultSpecifier': // import vue from 'vue';
                    case 'ImportSpecifier': // import { ref, computed } from 'vue';
                        alreadyDeclaration.add(name);
                        break;
                    default:
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
            }
        },
    });

    let res = '';
    for (const [fullpath, modules] of importStatements) {
        const source = fullpath.includes(sep) ? relative(dirname(id), fullpath) : fullpath;
        const importDefaultName = new Set();
        const importSpecifiersName = new Set();
        for (const module of modules) {
            if (alreadyDeclaration.has(module)) {
                continue;
            }
            if (module.startsWith(defaultFlag)) {
                importDefaultName.add(module.replace(defaultFlag, ''));
            } else {
                importSpecifiersName.add(module);
            }
        }
        if (importSpecifiersName.size) {
            res += `import { ${Array.from(importSpecifiersName).join(
                ', '
            )} } from '${source}';\n`;
        }
        if (importDefaultName.size) {
            res += `import ${
                Array.from(importDefaultName)[0]
            } from '${source}';\n`;
        }
    }
    const s = new MagicString(code);
    s.prependLeft(0, res);
    return {
        code: s.toString(),
        map: s.generateMap(),
    };
}
