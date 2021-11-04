import * as chalk from 'chalk';
import { writeFile, readdirSync } from 'fs';
import { resolve, extname, sep } from 'path';
import * as ts from 'typescript';
import { CompilerHost } from 'typescript';
import { ResolvedFileInfo, Packages, Inject } from './type/FileLoader';

const info = chalk.default.hex('#92790A');
const warning = chalk.default.hex('#F26464');

// https://github.com/microsoft/TypeScript/issues/21221#issuecomment-358222952
const tsOtions = {
    allowJs: false,
    declaration: true,
    emitDeclarationOnly: true,
    strictPropertyInitialization: false,
    skipLibCheck: true,
};
export const defaultFlag = '_export_default_';
type Filepath = string;
type Dts = string;
const dtsCache: Map<Filepath, Dts> = new Map();
export class FileLoader {
    host: CompilerHost = ts.createCompilerHost(tsOtions);
    importCtx: Map<string, string> = new Map();
    ignoreFiles: Set<string | RegExp> = new Set();
    private hasTs: boolean = !!require.resolve('typescript');
    constructor(private presetDir: string, private inject: Inject) {
        this.host.writeFile = (fileName, contents) => {
            dtsCache.set(fileName.replace(/\.d(\.ts)$/, '$1'), contents);
        };
    }

    // arg changedFile: modify all if not set changedFile. otherwise modify changedFile specified
    async generateDtsFromPreset(changedFile?: string) {
        // generate Dts content from specified folder
        const resolvedFiles = await this.fetchDts(this.presetDir, changedFile);
        const packages = await this.fetchPackages(this.inject);
        if (this.hasTs) {
            this.writeDts(resolvedFiles, packages);
        } else {
            console.warn(
                `[rollup-plugin-auto-import]: this plugin need typescript, please check.`
            );
        }
    }

    private async fetchPackages(inject: Inject): Promise<Packages> {
        const pkgMap: Packages = new Map();

        const injectArr = Object.entries(inject);
        const len = injectArr.length;

        function dfs(index: number) {
            try {
                const pkg = injectArr[index][0];
                const injectModules = injectArr[index][1];
                const resolvedPkg = require(pkg);
                const resolvedPkgs = Object.keys(resolvedPkg);
                for (const module of injectModules) {
                    if (resolvedPkgs.includes(module)) {
                        pkgMap.set(pkg, [...(pkgMap.get(pkg) || []), module]);
                    } else {
                        console.warn(
                            `[rollup-plugin-auto-import]: ${pkg} not support ${module}, please check`
                        );
                    }
                }
            } catch (e) {
                console.error((e as { message: string }).message);
            } finally {
                if (index < len - 1) {
                    dfs(index + 1);
                }
            }
        }

        return new Promise((res) => {
            if (len > 0) {
                dfs(0);
            }
            process.nextTick(() => {
                res(pkgMap);
            });
        });
    }

    private async fetchDts(
        presetDir: string,
        changedFile?: string
    ): Promise<ResolvedFileInfo[]> {
        let files: string[] = readdirSync(presetDir);
        const resolvedFiles: Map<string, ResolvedFileInfo> = new Map();
        files.forEach((file) => {
            const filename = file.replace(extname(file), '');
            const fullpath = resolve(presetDir, file);
            this.ignoreFiles.add(fullpath);
            resolvedFiles.set(fullpath, {
                fullpath,
                filename,
            });
        });
        let resolvedFilesArr = Object.values(Object.fromEntries(resolvedFiles));
        if (changedFile) {
            resolvedFilesArr = resolvedFilesArr.filter((_) =>
                _.fullpath.endsWith(changedFile)
            );
        }
        await this.generateDts(
            resolvedFilesArr.map((resolvedFile) => resolvedFile.fullpath)
        );
        for (const [fullpath, dts] of Object.entries(
            Object.fromEntries(dtsCache)
        )) {
            resolvedFiles.set(
                fullpath,
                Object.assign(resolvedFiles.get(fullpath), { dts })
            );
        }
        return Object.values(Object.fromEntries(resolvedFiles));
    }

    private async generateDts(fileNames: string[]): Promise<void> {
        const program = ts.createProgram(fileNames, tsOtions, this.host);
        return new Promise((res) => {
            process.nextTick(() => {
                program.emit(undefined, undefined, undefined, false);
                res();
            });
        });
    }

    private writeDts(
        resolvedFiles: ResolvedFileInfo[],
        packages: Packages
    ): void {
        let dts = '';
        resolvedFiles.forEach((resolvedFile) => {
            const _dts = this.removeUnnecessary(resolvedFile);
            dts += this.getImportCtx({
                dts: _dts,
                filename: resolvedFile.filename,
                fullpath: resolvedFile.fullpath,
            });
        });

        dts += Array.from(packages)
            .map(([pkg, modules]) =>
                Array.from(new Set(modules))
                    .map((module) => {
                        this.importCtx.set(module, pkg);
                        this.ignoreFiles.add(new RegExp(`${pkg}${sep}`));
                        return `const ${module}: typeof import('${pkg}')['${module}']\n`;
                    })
                    .join('')
            )
            .join('');

        dts = `declare global {\n${dts}}\nexport {}\n`;
        writeFile(
            'auto-import.d.ts',
            dts,
            {
                encoding: 'utf-8',
            },
            (err) => {
                if (err) throw err;
            }
        );
    }

    private getImportCtx({ dts, fullpath }: ResolvedFileInfo) {
        const variable = `[a-zA-Z_\\$]+[a-zA-Z0-9_\\$]*`;
        const prefix = '(var|let|const|function|class|enum)\\s';
        const reg = new RegExp(`${prefix}(${variable})`, 'g');
        const result = dts!.matchAll(reg);

        for (const res of result) {
            if (
                this.importCtx.has(res[2]) &&
                fullpath !== this.importCtx.get(res[2])
            ) {
                console.log(
                    `${info(
                        '[rollup-plugin-auto-import]: Identifier: '
                    )}${warning(`[${res[2]}]`)}${info(
                        ' already exist, please check '
                    )}${warning(`${this.importCtx.get(res[2])}`)}${info(
                        ' with '
                    )}${warning(`${fullpath}! `)}${info(
                        'Maybe you need rename this variable'
                    )}`
                );
                continue;
            }
            this.importCtx.set(res[2], fullpath);
        }
        return dts?.replace(defaultFlag, '');
    }

    private removeUnnecessary({ dts, filename }: ResolvedFileInfo) {
        // remove export
        const declare = /\bdeclare\b\s/g;
        const defaultName = /\b_default\b/;
        const exportSpecifier = /export (declare)/g;
        const exportDefault = /export default .+/;
        // remove import
        // https://regexr.com/47jlq
        const importStatement =
            /import\s+?(?:(?:(?:[\w*\s{},]*)\s+from\s+?)|)(?:(?:".*?")|(?:'.*?'))[\s]*?(?:;|$|)/g;

        return dts
            ?.replace(exportDefault, '')
            .replace(exportSpecifier, '$1')
            .replace(defaultName, `${defaultFlag}${filename}`)
            .replace(declare, '')
            .replace(importStatement, '');
    }
}
