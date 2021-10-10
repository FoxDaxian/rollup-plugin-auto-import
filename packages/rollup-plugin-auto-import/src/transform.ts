import { Node } from './type/node';
import { relative, dirname, sep } from 'path';
import { walk } from 'estree-walker';
import MagicString from 'magic-string';
import { FileLoader, defaultFlag } from './fileLoader';
import * as acorn from 'acorn';

export default function (code: string, id: string, fileLoader: FileLoader, parse?: typeof acorn.Parser) {
    const importStatements = new Map<string, string[]>();
    const alreadyDeclaration = new Set<string>();

    let ast: acorn.Node;
    // for jest
    if (parse) {
        ast = parse.parse(code);    
    } else {
        // @ts-ignore
        ast = this.parse(code);    
    }
    walk(ast, {
        enter(node: Node, parent: Node, prop, index) {
            if (node.type === 'Identifier') {
                const name = node.name!;
                switch (parent.type) {
                    case 'FunctionDeclaration': // function async function
                    case 'ImportNamespaceSpecifier': // import * as test from 'vue';
                    case 'ImportDefaultSpecifier': // import vue from 'vue';
                    case 'ImportSpecifier': // import { ref, computed } from 'vue';
                        alreadyDeclaration.add(name);
                        break;
                    case 'VariableDeclarator': // let const var
                        if (parent.init === node) {
                            add2ImportStatements(
                                name,
                                fileLoader,
                                importStatements
                            );
                        } else if (parent.id === node) {
                            alreadyDeclaration.add(name);
                        }
                        break;
                    case 'MemberExpression':
                        if (parent.object === node) {
                            add2ImportStatements(
                                name,
                                fileLoader,
                                importStatements
                            );
                        }
                        break;
                    case 'AssignmentExpression':
                        if (parent.right === node) {
                            add2ImportStatements(
                                name,
                                fileLoader,
                                importStatements
                            );
                        }
                        break;
                    case 'Property':
                        if (parent.value === node) {
                            add2ImportStatements(
                                name,
                                fileLoader,
                                importStatements
                            );
                        }
                        break;
                    default:
                        add2ImportStatements(
                            name,
                            fileLoader,
                            importStatements
                        );
                }
            }
        },
    });

    let res = '';
    for (const [fullpath, modules] of importStatements) {
        const source = fullpath.includes(sep)
            ? relative(dirname(id), fullpath)
            : fullpath;
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

function add2ImportStatements(
    name: string,
    fileLoader: FileLoader,
    importStatements: Map<string, string[]>
) {
    if (fileLoader.importCtx.has(name)) {
        const fullpath = fileLoader.importCtx.get(name)!;
        importStatements.set(fullpath, [
            ...(importStatements.get(fullpath) || []),
            name,
        ]);
    }
    if (fileLoader.importCtx.has(defaultFlag + name)) {
        const fullpath = fileLoader.importCtx.get(defaultFlag + name)!;
        importStatements.set(fullpath, [
            ...(importStatements.get(fullpath) || []),
            defaultFlag + name,
        ]);
    }
}
