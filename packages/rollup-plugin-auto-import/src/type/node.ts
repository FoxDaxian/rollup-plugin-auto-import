export interface Node {
    name?: string;
    type?: string;
    object?: Node;
    callee?: Node;
    value?: Node;
    property?: Node;
    left?: Node;
    id?: Node;
    key?: Node;
}
