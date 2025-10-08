export { SetSVGContext, MakeSVGContext, MakePolyLine, MakeRectangle, Rectangle, PolylinePointsString, UserToViewportCoords, DrawAxes, DrawGrid, SetBackgroundGradient, SetPoints };
import { assert, log } from "./misc-tools.js";
const SVG_NS = "http://www.w3.org/2000/svg";
let curCtx;
let mathJaxReady = false;
await preloadMathJax();
/* Preload MathJax exactly once */
export async function preloadMathJax() {
    if (mathJaxReady)
        return;
    //@ts-ignore
    if (!window.MathJax)
        throw new Error("MathJax not loaded. Include it before preloadMathJax().");
    //@ts-ignore
    await window.MathJax.startup.promise;
    mathJaxReady = true;
}
function SetSVGContext(ctx) {
    curCtx = ctx;
}
function MakeSVGContext(svg, userXMax, userYMax) {
    svg.ownerDocument.body.style.margin = "0";
    let viewBox = "" + (-userXMax) + " " + (-userYMax) + " " + (2 * userXMax) + " " + (2 * userYMax);
    svg.setAttribute("viewBox", viewBox);
    // Set up defs
    let defs = document.createElementNS(SVG_NS, "defs");
    svg.prepend(defs);
    // prevent right click making context window
    svg.addEventListener("contextmenu", (e) => e.preventDefault());
    let ctx = { svg, userXMax, userYMax, defs };
    SetUpDropShadowFilter(ctx);
    return ctx;
}
function SetUpDropShadowFilter(ctx) {
    let filter = document.createElementNS(SVG_NS, "filter");
    filter.setAttribute("id", "dropShadow");
    filter.setAttribute("filterUnits", "userSpaceOnUse");
    filter.setAttribute("x", String(-2 * ctx.userXMax));
    filter.setAttribute("y", String(-2 * ctx.userXMax));
    filter.setAttribute("width", String(4 * ctx.userXMax));
    filter.setAttribute("height", String(4 * ctx.userYMax));
    let feDropShadow = document.createElementNS(SVG_NS, "feDropShadow");
    feDropShadow.setAttribute("dx", "0.3");
    feDropShadow.setAttribute("dy", "0.3");
    feDropShadow.setAttribute("stdDeviation", "0.5");
    filter.appendChild(feDropShadow);
    ctx.defs.appendChild(filter);
}
function SetBackgroundGradient(colorBottomLeft, colorTopRight, ctx = curCtx) {
    let { userXMax, userYMax, defs } = curCtx;
    let linear = document.createElementNS(SVG_NS, "linearGradient");
    linear.setAttribute("id", "backgroundGradient");
    let bottomLeft = UserToViewportCoords({ x: -userXMax, y: -userYMax });
    let topRight = UserToViewportCoords({ x: userXMax, y: userYMax });
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
    let userTopLeft = { x: -userXMax, y: userYMax };
    let userBottomRight = { x: userXMax, y: -userYMax };
    let rect = MakeRectangle(userTopLeft, userBottomRight, "", false);
    rect.setAttribute("fill", "url(#backgroundGradient)");
    rect.setAttribute("stroke", "black");
    rect.setAttribute("stroke-width", "0.1");
    defs.after(rect);
}
function SetBackgroundColor(color = "lightgrey", gradient = {}, ctx = curCtx) {
    let { defs, userXMax, userYMax } = ctx;
    // Background rectangle spanning full viewport
    let userTopLeft = { x: -userXMax, y: userYMax };
    let userBottomRight = { x: userXMax, y: -userYMax };
    let rect = MakeRectangle(userTopLeft, userBottomRight, color, false);
    defs.after(rect);
}
function MakeRectangle(topLeft, bottomRight, color = "blue", dropShadow = false) {
    let width = (bottomRight.x - topLeft.x);
    let height = topLeft.y - bottomRight.y;
    let screenTopLeft = UserToViewportCoords(topLeft);
    let rect = document.createElementNS(SVG_NS, "rect");
    rect.setAttribute("x", String(screenTopLeft.x));
    rect.setAttribute("y", String(screenTopLeft.y));
    rect.setAttribute("width", String(width));
    assert(height >= 0);
    rect.setAttribute("height", String(height));
    rect.setAttribute("fill", color);
    if (dropShadow)
        rect.setAttribute("filter", "url(#dropShadow)");
    return rect;
}
function Rectangle(topLeft, bottomRight, color = "blue", dropShadow = false, ctx = curCtx) {
    let rect = MakeRectangle(topLeft, bottomRight, color, dropShadow);
    ctx.svg.appendChild(rect);
}
// User coordinates go from -USERXMAX to USERXMAX in x direction
// and from -USERYMAX to USERYMAX in y direction. Center = (0,0)
function UserToViewportCoords(p) {
    const viewportX = p.x;
    const viewportY = -p.y;
    return { x: viewportX, y: viewportY };
}
function Line(p1, p2, color = "blue", thickness = 1, dropShadow = true, ctx = curCtx) {
    let line = document.createElementNS(SVG_NS, "line");
    let screenP1 = UserToViewportCoords(p1);
    let screenP2 = UserToViewportCoords(p2);
    line.setAttribute("x1", String(screenP1.x));
    line.setAttribute("y1", String(screenP1.y));
    line.setAttribute("x2", String(screenP2.x));
    line.setAttribute("y2", String(screenP2.y));
    line.setAttribute("stroke", color);
    line.setAttribute("stroke-width", String(thickness));
    if (dropShadow)
        line.setAttribute("filter", "url(#dropShadow)");
    ctx.svg.appendChild(line);
}
function MakePolyLine(points = [], props = {}, ctx = curCtx) {
    let mergedProps = {
        color: "blue",
        thickness: 0.2,
        dropShadow: true,
        ...props
    };
    let polyLineSVG = document.createElementNS(SVG_NS, "polyline");
    let pointsString = PolylinePointsString(points);
    polyLineSVG.setAttribute("points", pointsString);
    polyLineSVG.setAttribute("stroke", mergedProps.color);
    polyLineSVG.setAttribute("stroke-width", String(mergedProps.thickness));
    polyLineSVG.setAttribute("fill", "none");
    if (mergedProps.dropShadow)
        polyLineSVG.setAttribute("filter", "url(#dropShadow)");
    ctx.svg.appendChild(polyLineSVG);
    return { polyLineSVG, points, props: mergedProps };
}
function PolylinePointsString(points) {
    let viewPortPoints = points.map(p => UserToViewportCoords(p));
    let pointsString = viewPortPoints.map(p => `${p.x},${p.y}`).join(" ");
    return pointsString;
}
function SetPoints(polyLine, points) {
    polyLine.points = points;
    let pointsString = PolylinePointsString(points);
    polyLine.polyLineSVG.setAttribute("points", pointsString);
}
function AddPoint(polyLine, point) {
    polyLine.points.push(point);
    let pointsString = PolylinePointsString(polyLine.points);
    polyLine.polyLineSVG.setAttribute("points", pointsString);
}
function DrawGrid(numGridLinesX, numGridLinesY, ctx = curCtx) {
    let { userXMax, userYMax } = curCtx;
    let deltaX = userXMax / numGridLinesX;
    let deltaY = userYMax / numGridLinesY;
    let maxX = userXMax;
    let maxY = userYMax;
    // TODO: Change Line, etc to all accept props
    for (let x = -maxX; x <= maxX; x += deltaX)
        Line({ x: x, y: -maxY }, { x: x, y: maxY }, "grey", 0.02, false, ctx);
    for (let y = -maxY; y <= maxY; y += deltaY)
        Line({ x: -maxX, y: y }, { x: maxX, y: y }, "grey", 0.02, false, ctx);
}
function DrawAxes(ctx = curCtx) {
    let topy = { x: 0, y: 9 };
    let boty = { x: 0, y: -9 };
    let leftx = { x: -9, y: 0 };
    let rightx = { x: 2, y: 0 };
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
    addLaTeXLabel(rightx, "x", { exHeight: 0.5, dx: 0.5, dy: 0 });
    addLaTeXLabel(topy, "y", { exHeight: 0.5, dx: 0.5, dy: -0.3 });
}
function userToScreen(x, y, ctx = curCtx) {
    const pt = ctx.svg.createSVGPoint();
    pt.x = x;
    pt.y = y;
    const ctm = ctx.svg.getScreenCTM();
    return pt.matrixTransform(ctm);
}
function addLaTeXLabel(pos, label, props = {}, ctx = curCtx) {
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
    let posVP = UserToViewportCoords(pos);
    let xTranslate = posVP.x - widthInUserViewport / 2 + mergedProps.dx;
    let yTranslate = posVP.y + heightInUserViewport / 2 + svgVerticalAlign * wantedXHeightInUserViewport - mergedProps.dy;
    g.setAttribute("transform", "translate(" + xTranslate + ", " + yTranslate + ") scale(" + scale + ")");
    // move all MathJax SVG children into the group
    g.append(...mathSVG.childNodes);
    // append the group into your own SVG
    curCtx.svg.appendChild(g);
}
//# sourceMappingURL=svg-draw.js.map