declare global {
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
