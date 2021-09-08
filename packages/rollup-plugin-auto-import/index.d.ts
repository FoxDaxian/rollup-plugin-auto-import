import { FilterPattern } from '@rollup/pluginutils';
import { Inject } from './src/type/FileLoader';
export interface Options {
    presetDir?: string;
    include?: FilterPattern;
    exclude?: FilterPattern;
    inject?: Inject;
}
export default function (options?: Options): {
    name: string;
    transform(code: string, id: string): void;
};
