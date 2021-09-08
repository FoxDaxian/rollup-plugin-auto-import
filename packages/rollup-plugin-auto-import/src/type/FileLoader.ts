export interface ResolvedFileInfo {
    fullpath: string;
    filename: string;
    dts?: string;
}

export interface CreatedFiles {
    [key: string]: any;
}

export type Packages = Map<string, string[]>;

export interface Inject {
    [key: string]: string[]
}