export default function json(options = {}) {
    return {
        name: 'test-plugin',

        transform(code, id) {
            // console.log(this.parse(code));
        },
        resolveId(source, importer) {
            // console.log(source, importer, '======');
        },
    };
}
