document.body.style.margin = "0"

const SVG_NS = "http://www.w3.org/2000/svg";
const el = document.getElementById("svgRoot");
if (!(el instanceof SVGSVGElement)) {
  throw new Error("svgRoot is missing or not an <svg> element");
}

let svg = el;

// svg element expands to biggest square which can fit in window
svg.setAttribute("width", "100vmin")
svg.setAttribute("height", "100vmin")

// User coordinates run from -10 to 10 left to right
// and from -10 to 10 bottom to top.
const USER_X_MAX = 10
const USER_Y_MAX = 10
const viewBox = "" + (-USER_X_MAX) +" "+ (-USER_Y_MAX) +" "+ (2*USER_X_MAX) +" "+ (2*USER_Y_MAX)
svg.setAttribute("viewBox", viewBox)
const GRID_LINES = 10 // number of grid lines from origin to USER_X_MAX


let defs = document.createElementNS(SVG_NS, "defs");
svg.prepend(defs)
SetUpDefs()


/*
---------------------------------------------------------------------------------
 Function definitions
 --------------------------------------------------------------------------------
*/

/*
A point is an object shaped like this:
{
    x:
    y:
}
*/

function SetUpDefs()
{
    SetUpDropShadowFilter()
}

function SetUpDropShadowFilter()
{
    let filter = document.createElementNS(SVG_NS, "filter");    
    filter.setAttribute("id", "dropShadow");
    filter.setAttribute("filterUnits", "userSpaceOnUse")
    filter.setAttribute("x", String(-2*USER_X_MAX))
    filter.setAttribute("y", String(-2*USER_Y_MAX))
    filter.setAttribute("width", String(4*USER_X_MAX))
    filter.setAttribute("height", String(4*USER_Y_MAX))


    let feDropShadow = document.createElementNS(SVG_NS, "feDropShadow");
    feDropShadow.setAttribute("dx", "0.3");
    feDropShadow.setAttribute("dy", "0.3");
    feDropShadow.setAttribute("stdDeviation", "0.5");
    // feDropShadow.setAttribute("flood-color", "grey");
    // feDropShadow.setAttribute("flood-opacity", "0.5");
    filter.appendChild(feDropShadow);
    defs.appendChild(filter)
}

function SetBackgroundGradient(colorBottomLeft, colorTopRight)
{
    let linear = document.createElementNS(SVG_NS, "linearGradient")
    linear.setAttribute("id", "backgroundGradient");
    let bottomLeft = UserToViewportCoords({x: -USER_X_MAX, y: -USER_Y_MAX})
    let topRight = UserToViewportCoords({x: USER_X_MAX, y: USER_Y_MAX})

    linear.setAttribute("x1", String(bottomLeft.x));
    linear.setAttribute("y1", String(bottomLeft.y));
    linear.setAttribute("x2", String(topRight.x));
    linear.setAttribute("y2", String(topRight.y));
    linear.setAttribute("gradientUnits", "userSpaceOnUse")
    
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
    let userTopLeft = {x : -USER_X_MAX, y: USER_Y_MAX}
    let userBottomRight = {x : USER_X_MAX, y: -USER_Y_MAX }
    let rect = MakeRectangle(userTopLeft, userBottomRight, "", false)
    rect.setAttribute("fill", "url(#backgroundGradient)")
    rect.setAttribute("stroke", "black")
    rect.setAttribute("stroke-width", "0.1")

    defs.after(rect)
}

function SetBackgroundColor(color="lightgrey", gradient = {}) {
    // Background rectangle spanning full viewport
    let userTopLeft = {x : -USER_X_MAX, y: USER_Y_MAX}
    let userBottomRight = {x : USER_X_MAX, y: -USER_Y_MAX }
    let rect = MakeRectangle(userTopLeft, userBottomRight, color, false)
    defs.after(rect)
}

function MakeRectangle(topLeft, bottomRight, color = "blue", dropShadow = false) {
    let width = (bottomRight.x - topLeft.x)
    let height = topLeft.y - bottomRight.y
    let screenTopLeft = UserToViewportCoords(topLeft)
    let rect = document.createElementNS(SVG_NS, "rect")
    rect.setAttribute("x", String(screenTopLeft.x))
    rect.setAttribute("y", String(screenTopLeft.y))
    rect.setAttribute("width", String(width))
    assert(height >= 0)
    rect.setAttribute("height", String(height))
    rect.setAttribute("fill", color);
    if (dropShadow)
        rect.setAttribute("filter", "url(#dropShadow)");
    return rect
}

function Rectangle(topLeft, bottomRight, color = "blue", dropShadow = false) {
    let rect = MakeRectangle(topLeft, bottomRight, color, dropShadow)
    svg.appendChild(rect);
}

// User coordinates go from -USERXMAX to USERXMAX in x direction
// and from -USERYMAX to USERYMAX in y direction. Center = (0,0)
function UserToViewportCoords(p) {
    const viewportX =  p.x;
    const viewportY = -p.y;
    return { x: viewportX, y: viewportY };
}

function Line (p1, p2, color="blue", thickness=1, dropShadow = true)
{
    let line = document.createElementNS(SVG_NS, "line")
    
    let screenP1 = UserToViewportCoords(p1)
    let screenP2 = UserToViewportCoords(p2)

    line.setAttribute("x1", String(screenP1.x))
    line.setAttribute("y1", String(screenP1.y))
    line.setAttribute("x2", String(screenP2.x))
    line.setAttribute("y2", String(screenP2.y))
    line.setAttribute("stroke", color)
    line.setAttribute("stroke-width", String(thickness))

    if (dropShadow)
        line.setAttribute("filter", "url(#dropShadow)");

    svg.appendChild(line)
}

/* A polyLine is an object shaped like this:
{
    polyLineSVG:    SVGPolylineElement    
    points:         point[]
    props:          {   color:
                        thickness:
                        dropShadow}
                    }
}
*/


function MakePolyLine(points = [], props = {}) 
{
    let mergedProps = {
        color: "blue", 
        thickness: 0.2, 
        dropShadow: true,
        ...props
    }

    let polyLineSVG = document.createElementNS(SVG_NS, "polyline")
    let pointsString = PolylinePointsString(points)
    polyLineSVG.setAttribute("points", pointsString)
    polyLineSVG.setAttribute("stroke", mergedProps.color)
    polyLineSVG.setAttribute("stroke-width", String(mergedProps.thickness))
    polyLineSVG.setAttribute("fill", "none")
    if (mergedProps.dropShadow)
        polyLineSVG.setAttribute("filter", "url(#dropShadow)");
    svg.appendChild(polyLineSVG)
    return {polyLineSVG, points, props: mergedProps}
}


function PolylinePointsString(points)
{
    let viewPortPoints = points.map(p => UserToViewportCoords(p))
    let pointsString = viewPortPoints.map(p => `${p.x},${p.y}`).join(" ")
    return pointsString
}

function SetPoints(polyLine, points)
{
    polyLine.points = points
    let pointsString = PolylinePointsString(points)
    polyLine.polyLineSVG.setAttribute("points", pointsString)
}

function AddPoint(polyLine, point) 
{
    polyLine.points.push(point)
    let pointsString = PolylinePointsString(polyLine.points)
    polyLine.polyLineSVG.setAttribute("points", pointsString)
}   

function DrawGrid()
{
    let delta = USER_X_MAX / GRID_LINES
    let max = USER_Y_MAX

    for (let x = -max; x <= max; x+=delta )
        Line({x: x, y: -max}, {x: x, y: max}, "grey", 0.02, false)

    for (let y = -max; y <= max; y+=delta )
        Line({x: -max, y: y}, {x: max, y: y}, "grey", 0.02, false)

    Line({x: -max, y: 0}, {x: max, y: 0}, "black", 0.04, false)
    Line({x: 0, y: -max}, {x: 0, y: max}, "black", 0.04, false)
}

function userToScreen(x, y) {
  const pt = svg.createSVGPoint();
  pt.x = x;
  pt.y = y;
  const ctm = svg.getScreenCTM();
  return pt.matrixTransform(ctm);
}