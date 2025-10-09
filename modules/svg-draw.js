export { SetSVGContext, MakeSVGContext, MakePolyLine, MakeRectangle, Rectangle, PolylinePointsString, UserToViewBox as UserToViewportCoords, DrawAxes, DrawGrid, SetBackgroundGradient, SetPoints, Line };
import { assert, log } from "./misc-tools.js";
const SVG_NS = "http://www.w3.org/2000/svg";
let curCtx;
async function ensureMathJaxReady() {
    // @ts-ignore
    if (!window.MathJax)
        throw new Error("MathJax script not loaded at all");
    // @ts-ignore
    const startup = window.MathJax.startup;
    if (startup?.promise) {
        await startup.promise; // waits only if still loading
    }
}
function SetSVGContext(ctx) {
    assert(ctx);
    curCtx = ctx;
}
function MakeSVGContext(svg, bounds) {
    assert(svg);
    svg.ownerDocument.body.style.margin = "0";
    let viewBoxTopLeftX = bounds.xMin;
    let viewBoxTopLeftY = bounds.yMin;
    let viewBoxWidth = bounds.xMax - bounds.xMin;
    let viewBoxHeight = bounds.yMax - bounds.yMin;
    let viewBox = "" + viewBoxTopLeftX + " " + viewBoxTopLeftY + " " + viewBoxWidth + " " + viewBoxHeight;
    svg.setAttribute("viewBox", viewBox);
    svg.setAttribute("preserveAspectRatio", "none");
    // Set up defs
    let defs = document.createElementNS(SVG_NS, "defs");
    svg.prepend(defs);
    // prevent right click making context window
    svg.addEventListener("contextmenu", (e) => e.preventDefault());
    let ctx = { svg, defs, bounds };
    SetUpDropShadowFilter(ctx);
    return ctx;
}
function SetUpDropShadowFilter(ctx) {
    assert(ctx);
    let filter = document.createElementNS(SVG_NS, "filter");
    filter.setAttribute("id", "dropShadow");
    filter.setAttribute("filterUnits", "userSpaceOnUse");
    // Drop shadows need to have a filter which takes place in a box twice the size of the viewBox?? TODO: Check this. 
    // I've just made it the same size
    let topLeftUser = { x: ctx.bounds.xMin, y: ctx.bounds.yMax };
    let topLeftViewBox = UserToViewBox(topLeftUser, ctx);
    let width = ctx.bounds.xMax - ctx.bounds.xMin;
    let height = ctx.bounds.yMax - ctx.bounds.yMin;
    filter.setAttribute("x", String(topLeftViewBox.x));
    filter.setAttribute("y", String(topLeftViewBox.y));
    filter.setAttribute("width", String(width));
    filter.setAttribute("height", String(height));
    let feDropShadow = document.createElementNS(SVG_NS, "feDropShadow");
    feDropShadow.setAttribute("dx", "0.3");
    feDropShadow.setAttribute("dy", "0.3");
    feDropShadow.setAttribute("stdDeviation", "0.5");
    filter.appendChild(feDropShadow);
    ctx.defs.appendChild(filter);
}
function SetBackgroundGradient(colorBottomLeft, colorTopRight, ctx = curCtx) {
    assert(ctx);
    let { bounds, defs } = ctx;
    let linear = document.createElementNS(SVG_NS, "linearGradient");
    let id = ctx.svg.id + "-backgroundGradient";
    linear.setAttribute("id", id);
    let bottomLeft = UserToViewBox({ x: bounds.xMin, y: bounds.yMin }, ctx);
    let topRight = UserToViewBox({ x: bounds.xMax, y: bounds.yMax }, ctx);
    linear.setAttribute("x1", String(bottomLeft.x));
    linear.setAttribute("y1", String(bottomLeft.y));
    linear.setAttribute("x2", String(topRight.x));
    linear.setAttribute("y2", String(topRight.y));
    linear.setAttribute("gradientUnits", "userSpaceOnUse");
    let stop1 = document.createElementNS(SVG_NS, "stop");
    stop1.setAttribute("offset", "0%");
    stop1.setAttribute("stop-color", colorBottomLeft);
    let stop2 = document.createElementNS(SVG_NS, "stop");
    stop2.setAttribute("offset", "100%");
    stop2.setAttribute("stop-color", colorTopRight);
    linear.appendChild(stop1);
    linear.appendChild(stop2);
    defs.appendChild(linear);
    // Background rectangle spanning full viewport
    let userTopLeft = { x: bounds.xMin, y: bounds.yMax };
    let userBottomRight = { x: bounds.xMax, y: bounds.yMin };
    let rect = MakeRectangle(userTopLeft, userBottomRight, "", false, ctx);
    rect.setAttribute("fill", `url(#${id})`);
    rect.setAttribute("stroke", "black");
    rect.setAttribute("stroke-width", "0.1");
    defs.after(rect);
}
function SetBackgroundColor(color = "lightgrey", gradient = {}, ctx = curCtx) {
    assert(ctx);
    let { defs, bounds } = ctx;
    // Background rectangle spanning full viewport
    let userTopLeft = { x: bounds.xMin, y: bounds.yMax };
    let userBottomRight = { x: bounds.xMax, y: bounds.yMin };
    let rect = MakeRectangle(userTopLeft, userBottomRight, color, false);
    defs.after(rect);
}
function MakeRectangle(topLeft, bottomRight, color = "blue", dropShadow = false, ctx = curCtx) {
    assert(ctx);
    let width = (bottomRight.x - topLeft.x);
    let height = topLeft.y - bottomRight.y;
    let viewBoxTopLeft = UserToViewBox(topLeft, ctx);
    let rect = document.createElementNS(SVG_NS, "rect");
    rect.setAttribute("x", String(viewBoxTopLeft.x));
    rect.setAttribute("y", String(viewBoxTopLeft.y));
    rect.setAttribute("width", String(width));
    assert(height >= 0);
    rect.setAttribute("height", String(height));
    rect.setAttribute("fill", color);
    if (dropShadow) {
        // TO DO - sort out dropshadows! This is a reference to the global dropshadow. Maybe go over to CSS
        rect.setAttribute("filter", "url(#dropShadow)");
    }
    return rect;
}
function Rectangle(topLeft, bottomRight, color = "blue", dropShadow = false, ctx = curCtx) {
    assert(ctx);
    let rect = MakeRectangle(topLeft, bottomRight, color, dropShadow, ctx);
    ctx.svg.appendChild(rect);
}
function UserToViewBox(userPoint, ctx = curCtx) {
    assert(ctx);
    let bounds = ctx.bounds;
    let viewboxX = userPoint.x;
    // y goes up the page, as opposed to svg.
    // When userpoint.y = bounds.ymax, viewbox.y should be ymin.
    // When userpoint.y = bounds.ymin, viewbox.y should be ymax.
    let viewboxY = bounds.yMax + bounds.yMin - userPoint.y;
    return { x: viewboxX, y: viewboxY };
}
// TODO: Change Line, etc to all accept props
function Line(p1, p2, color = "blue", thickness = 1, dropShadow = false, ctx = curCtx) {
    assert(ctx);
    let line = document.createElementNS(SVG_NS, "line");
    let viewBoxP1 = UserToViewBox(p1, ctx);
    let viewBoxP2 = UserToViewBox(p2, ctx);
    line.setAttribute("x1", String(viewBoxP1.x));
    line.setAttribute("y1", String(viewBoxP1.y));
    line.setAttribute("x2", String(viewBoxP2.x));
    line.setAttribute("y2", String(viewBoxP2.y));
    line.setAttribute("stroke", color);
    line.setAttribute("stroke-width", String(thickness));
    if (dropShadow)
        line.setAttribute("filter", "url(#dropShadow)");
    ctx.svg.appendChild(line);
}
function MakePolyLine(points = [], props = {}, ctx = curCtx) {
    assert(ctx);
    let mergedProps = {
        color: "blue",
        thickness: 0.2,
        dropShadow: false,
        ...props
    };
    let polyLineSVG = document.createElementNS(SVG_NS, "polyline");
    let pointsString = PolylinePointsString(points, ctx);
    polyLineSVG.setAttribute("points", pointsString);
    polyLineSVG.setAttribute("stroke", mergedProps.color);
    polyLineSVG.setAttribute("stroke-width", String(mergedProps.thickness));
    polyLineSVG.setAttribute("fill", "none");
    if (mergedProps.dropShadow)
        polyLineSVG.setAttribute("filter", "url(#dropShadow)");
    ctx.svg.appendChild(polyLineSVG);
    return { polyLineSVG, points, props: mergedProps };
}
function PolylinePointsString(points, ctx = curCtx) {
    assert(ctx);
    let viewPortPoints = points.map(p => UserToViewBox(p, ctx));
    let pointsString = viewPortPoints.map(p => `${p.x},${p.y}`).join(" ");
    return pointsString;
}
function SetPoints(polyLine, points, ctx = curCtx) {
    assert(ctx);
    polyLine.points = points;
    let pointsString = PolylinePointsString(points, ctx);
    polyLine.polyLineSVG.setAttribute("points", pointsString);
}
function AddPoint(polyLine, point, ctx = curCtx) {
    assert(ctx);
    polyLine.points.push(point);
    let pointsString = PolylinePointsString(polyLine.points, ctx);
    polyLine.polyLineSVG.setAttribute("points", pointsString);
}
function DrawGrid(ctx = curCtx, densityGridLinesX = 1, densityGridLinesY = 1) {
    assert(ctx);
    let { bounds } = ctx;
    let width = bounds.xMax - bounds.xMin;
    let height = bounds.yMax - bounds.yMin;
    let deltaX = 1 / densityGridLinesX;
    let deltaY = 1 / densityGridLinesY;
    for (let x = bounds.xMin; x <= bounds.xMax; x += deltaX)
        Line({ x: x, y: bounds.yMin }, { x: x, y: bounds.yMax }, "grey", 0.02, false, ctx);
    for (let y = bounds.yMin; y <= bounds.yMax; y += deltaY)
        Line({ x: bounds.xMin, y: y }, { x: bounds.xMax, y: y }, "grey", 0.02, false, ctx);
}
function DrawAxes(ctx = curCtx) {
    assert(ctx);
    let topy = { x: 0, y: ctx.bounds.yMax };
    let boty = { x: 0, y: ctx.bounds.yMin };
    let leftx = { x: ctx.bounds.xMin, y: 0 };
    let rightx = { x: ctx.bounds.xMax, y: 0 };
    let arrLen = 0.3;
    // Main axes
    Line(leftx, rightx, "black", 0.04, false, ctx); // X axis
    Line(boty, topy, "black", 0.04, false, ctx); // Y axis
    // Arrowheads for +Y
    Line({ x: topy.x - arrLen, y: topy.y - arrLen }, topy, "black", 0.04, false, ctx);
    Line({ x: topy.x + arrLen, y: topy.y - arrLen }, topy, "black", 0.04, false, ctx);
    // Arrowheads for -Y
    Line({ x: boty.x - arrLen, y: boty.y + arrLen }, boty, "black", 0.04, false, ctx);
    Line({ x: boty.x + arrLen, y: boty.y + arrLen }, boty, "black", 0.04, false, ctx);
    // Arrowheads for +X
    Line({ x: rightx.x - arrLen, y: rightx.y + arrLen }, rightx, "black", 0.04, false, ctx);
    Line({ x: rightx.x - arrLen, y: rightx.y - arrLen }, rightx, "black", 0.04, false, ctx);
    addLaTeXLabel(rightx, "x", { exHeight: 0.5, dx: 0.5, dy: 0 }, ctx);
    addLaTeXLabel(topy, "y", { exHeight: 0.5, dx: 0.5, dy: -0.3 }, ctx);
}
async function addLaTeXLabel(pos, label, props = {}, ctx = curCtx) {
    assert(ctx);
    await ensureMathJaxReady();
    let mergedProps = {
        exHeight: 1,
        dx: 0,
        dy: 0,
        ...props
    };
    //@ts-ignore
    let container = window.MathJax.tex2svg(label, { display: false });
    let mathSVG = container.querySelector('svg');
    let svgHeightInEx = mathSVG.height.baseVal.valueInSpecifiedUnits;
    let svgVerticalAlign = parseFloat(mathSVG.style.verticalAlign);
    let g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    let vb = mathSVG.viewBox.baseVal;
    let height = vb.height;
    let width = vb.width;
    let wantedXHeightInUserViewport = mergedProps.exHeight;
    let scale = wantedXHeightInUserViewport / ((height / svgHeightInEx));
    let widthInUserViewport = scale * width;
    let heightInUserViewport = scale * height;
    // TODO: Fix this so it is in user coordinate system
    let posViewBox = UserToViewBox(pos, ctx);
    let xTranslate = posViewBox.x - widthInUserViewport / 2 + mergedProps.dx;
    let yTranslate = posViewBox.y + heightInUserViewport / 2 + svgVerticalAlign * wantedXHeightInUserViewport - mergedProps.dy;
    g.setAttribute("transform", "translate(" + xTranslate + ", " + yTranslate + ") scale(" + scale + ")");
    // move all MathJax SVG children into the group
    g.append(...mathSVG.childNodes);
    // append the group into your own SVG
    ctx.svg.appendChild(g);
}
//# sourceMappingURL=svg-draw.js.map