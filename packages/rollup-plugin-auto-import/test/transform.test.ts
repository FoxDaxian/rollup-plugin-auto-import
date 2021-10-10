import transform from '../src/transform';
import { FileLoader } from '../src/fileLoader';
import * as acorn from 'acorn';
import fs from 'fs';

const dts = `declare global {
const defaultObj: {
    name: string;
    fn(): void;
};

let variable: boolean;
enum Directions {
    Up = 0,
    Down = 1,
    Left = 2,
    Right = 3
}

const defaultfn: (age: number) => string;

const specifier = "origin";
class ClassName {
    private test;
}
const innerRef: import("vue").Ref<number>;
function fsy(): void;
const ref: typeof import('vue')['ref']
}
export {}
`;

const _transformRes = `import { fsy, innerRef } from 'auto-import/specifier.ts';
import defaultfn from 'auto-import/defaultfn.ts';
import defaultObj from 'auto-import/defaultObj.ts';
import { ref } from 'vue';

console.log(fsy);

console.log(defaultfn(12));


console.log(defaultObj.name);

const count = ref<number>(1);
const count2 = ref(323);

console.log(count.value, count2.value);
console.log(innerRef.value, '==xxxxxxxx--');
`;

let fileLoader: FileLoader;
beforeAll(async () => {
    fileLoader = new FileLoader('auto-import', { vue: ['ref'] });
    await fileLoader.generateDtsFromPreset();
});


describe('transform test:', () => {
    test('generate dts', () => {
        fs.readFile(
            require.resolve('../auto-import.d.ts'),
            (err, data: Buffer) => {
                if (err) {
                    throw err;
                }
                expect(data.toString()).toBe(dts);
            }
        );
    });
    test('transform result', () => {
        const transformRes = transform(`
console.log(fsy);

console.log(defaultfn(12));


console.log(defaultObj.name);

const count = ref<number>(1);
const count2 = ref(323);

console.log(count.value, count2.value);
console.log(innerRef.value, '==xxxxxxxx--');
`, 'test.ts', fileLoader, acorn.Parser);
        expect(transformRes.code).toBe(_transformRes);
    });
});
