import { writeFileSync, readdirSync, readFileSync } from 'fs';
import { resolve, extname, sep } from 'path';
import * as ts from 'typescript';
import {
    ResolvedFileInfo,
    CreatedFiles,
    Packages,
    Inject,
} from './type/FileLoader';

export const defaultFlag = '_export_default_';

export class FileLoader {
    importCtx: Map<string, string> = new Map();
    ignoreFiles: Set<string | RegExp> = new Set();
    private hasTs: boolean = !!require.resolve('typescript');
    constructor(private presetDir: string, private inject: Inject) {}

    generateDtsFromPreset() {
        const resolvedFiles = this.fetchDts(this.presetDir);
        const packages = this.fetchPackages(this.inject);
        if (this.hasTs) {
            this.writeDts(resolvedFiles, packages);
        } else {
            console.warn(
                `[rollup-plugin-auto-import]: this plugin need typescript, please check.`
            );
        }
    }

    private fetchPackages(inject: Inject): Packages {
        const pkgMap: Packages = new Map();

        const injectArr = Object.entries(inject);
        const len = injectArr.length;
        dfs(0);
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
                console.error(e.message);
            } finally {
                if (index < len - 1) {
                    dfs(index + 1);
                }
            }
        }

        for (let i = 0; i < len; ++i) {}
        return pkgMap;
    }

    private fetchDts(presetDir: string): ResolvedFileInfo[] {
        const files: string[] = readdirSync(presetDir);
        const resolvedFiles: ResolvedFileInfo[] = [];
        let i = -1;
        files.forEach((file) => {
            const filename = file.replace(extname(file), '');
            const fullpath = resolve(presetDir, file);
            this.ignoreFiles.add(fullpath);
            resolvedFiles.push({
                fullpath,
                filename,
            });
        });
        for (const [fullpath, dts] of this.generateDts(
            resolvedFiles.map((resolvedFile) => resolvedFile.fullpath),
            {
                allowJs: true,
                declaration: true,
                emitDeclarationOnly: true,
            }
        )) {
            resolvedFiles[++i].dts = dts;
        }
        return resolvedFiles;
    }

    private generateDts(
        fileNames: string[],
        options: ts.CompilerOptions
    ): [string, string][] {
        // Create a Program with an in-memory emit
        const createdFiles: CreatedFiles = {};
        const host = ts.createCompilerHost(options);
        host.writeFile = (fileName, contents) =>
            (createdFiles[fileName] = contents);

        // Prepare and emit the d.ts files
        const program = ts.createProgram(fileNames, options, host);
        program.emit();

        return Object.entries(createdFiles);
    }

    private writeDts(
        resolvedFiles: ResolvedFileInfo[],
        packages: Packages
    ): void {
        let dts = '';
        resolvedFiles.forEach((resolvedFile) => {
            const _dts = this.replaceExport(resolvedFile);
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

        // TODO: 加缩进哈
        // TODO: 三方库的types
        // TODO: vue集成后，引入ref报错了, 加了include后解决了，也许不是最好的解决方案
        // TODO: 修改auto-import目录，导致hot-reload支持有些慢，需要解决(最好)
        // TODO: 构建时间问题
        dts = `declare global {\n${dts}}\nexport {}\n`;
        writeFileSync('auto-import.d.ts', dts, {
            encoding: 'utf-8',
        });
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
                console.warn(
                    `[rollup-plugin-auto-import]: Identifier: ${
                        res[2]
                    } already exist, please check ${this.importCtx.get(
                        res[2]
                    )} with ${fullpath}`
                );
                continue;
            }
            this.importCtx.set(res[2], fullpath);
        }
        return dts?.replace(defaultFlag, '');
    }

    private replaceExport({ dts, filename }: ResolvedFileInfo) {
        const declare = /\bdeclare\b\s/g;
        const defaultName = /\b_default\b/;
        const exportSpecifier = /export (declare)/g;
        const exportDefault = /export default .+/;
        return dts
            ?.replace(exportDefault, '')
            .replace(exportSpecifier, '$1')
            .replace(defaultName, `${defaultFlag}${filename}`)
            .replace(declare, '');
    }
}
