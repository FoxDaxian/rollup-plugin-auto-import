declare global {
const index: {
    name: string;
    innerCount: import("vue").Ref<number>;
};

const ref: typeof import('vue')['ref']
const computed: typeof import('vue')['computed']
}
export {}
