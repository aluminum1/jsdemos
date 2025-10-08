interface Point {
  x: number;
  y: number;
}

let curPoints: Point[] = [{ x: 1, y: 2 }];

function assertIsDefined<T>(val: T): asserts val is NonNullable<T> {
  if (val === undefined || val === null) {
    throw new Error(`Expected 'val' to be defined, but received ${val}`);
  }
}

let curPoint = curPoints[curPoints.length - 1];
assertIsDefined(curPoint);
curPoint.y; // ✅ no squiggle, type is Point
