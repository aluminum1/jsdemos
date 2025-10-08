export { assert, log };
function assert(condition, message = "Assertion failed") {
    if (!condition)
        throw new Error(message);
}
function log(...args) {
    console.log(...args);
}
//# sourceMappingURL=misc-tools.js.map