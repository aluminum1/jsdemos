let curPoints = [{ x: 1, y: 2 }];
function assertIsDefined(val) {
    if (val === undefined || val === null) {
        throw new Error(`Expected 'val' to be defined, but received ${val}`);
    }
}
let curPoint = curPoints[curPoints.length - 1];
assertIsDefined(curPoint);
curPoint.y; // ✅ no squiggle, type is Point
export {};
//# sourceMappingURL=testassert.js.map