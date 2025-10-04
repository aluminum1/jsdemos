const LENGTH_OF_PATH = 100
const DELTA_X = USER_X_MAX / LENGTH_OF_PATH
const DELTA_Y = USER_Y_MAX / LENGTH_OF_PATH
const NUM_BINS = 100


DrawGrid()
DrawAxes()


let curPoints = [{x: -USER_X_MAX, y: 0}]
let curPolyLine = MakePolyLine(curPoints)
let globalTime, timeFirstPushed = 0
let startNewPathOnNextTick = true
let histogramView;


SetBackgroundGradient("rgb(200,230,230)", "rgb(255, 255, 255)")
SetUpKeyListeners()
InitializeHistogram()

const SIM_TICKS_PER_SECOND = 10_000_000 // (10 million!!!)

const SIM_DT = 1000 / SIM_TICKS_PER_SECOND // The budget each sim tick has to run
let simAccumulator = 0 // How much cash you have on hand to spend
let lastTime = performance.now()
let timeElapsedSinceLastFrame = 0
let running = false

// Counters for logging
let frameCount= 0
let simCount = 0
let totalSimCount = 0
let lastFpsLog = performance.now()

requestAnimationFrame(FrameDraw)






/*
----------------------------
Function defintions
-----------------------------
*/

function SimulateOneTick() {
    
    if (startNewPathOnNextTick) {
        curPoints = [{x: -USER_X_MAX, y:0}]
        startNewPathOnNextTick = false
        return
    }

    let curPoint = curPoints[curPoints.length - 1]
    let jump = GetRandomJump()
    let newPoint = {
        x: -USER_X_MAX + curPoints.length * DELTA_X, 
        y: curPoint.y + jump * DELTA_Y
    }
    curPoints.push(newPoint)
    if (curPoints.length == LENGTH_OF_PATH) {
        AddDataValue(histogramView.bins, newPoint.y)
        startNewPathOnNextTick = true
    }

    simCount++
    totalSimCount++
}

function FrameDraw(now) {
    timeElapsedSinceLastFrame = now - lastTime
    lastTime = now

    if (running)
    {
        simAccumulator += timeElapsedSinceLastFrame
        while (simAccumulator >= SIM_DT) {
            SimulateOneTick()
            simAccumulator -= SIM_DT
         }
    }

    ChangeDOM()
    frameCount++

    // Log every second while running
    if (now - lastFpsLog >= 1000) {
        if (running)
            log(`FPS: ${frameCount}, SPS: ${simCount}, Total sims: ${totalSimCount}`);
        frameCount = 0;
        simCount = 0;
        lastFpsLog = now;
    }


    requestAnimationFrame(FrameDraw)
}

function ChangeDOM() {
    SetPoints(curPolyLine, curPoints)
    RefreshSVG(histogramView)
}

function InitializeHistogram() {
    let bins = [];
    let binWidth = (2 * USER_Y_MAX) / NUM_BINS;  
    for (let i = -USER_Y_MAX; i < USER_Y_MAX; i += binWidth) {
        bins.push({min: i, max: i + binWidth, numberInBin: 0});
    }
    histogramView = MakeHistogramView(bins);
}


function InitializePoints()
{
    curPolyLine.polyLineSVG.remove()
    curPoints = [{x: -USER_X_MAX, y: 0}]
    curPolyLine = MakePolyLine(curPoints)
}

function GetRandomJump()
{
    return Math.random() < 0.5 ? -1 : 1
}

function SetUpKeyListeners() {
    
    // === Keyboard ===
    document.addEventListener("keydown", (e) =>  {
        if (e.code === "ArrowRight" || e.code === "Space") {
            running = true;
        }
    });

    document.addEventListener("keyup", (e) => {
        if (e.code === "ArrowRight" || e.code === "Space") {
            running = false;
        }
    });

    // === Mouse ===
    svg.addEventListener("mousedown", (e) => {
        if (e.button === 0) {  // left mouse button
            running = true;
        }
    });

    document.addEventListener("mouseup", (e) => {
        if (e.button === 0) {
            running = false;
        }
    });

    // === Touch (mobile) ===
    svg.addEventListener("touchstart", (e) => {
        e.preventDefault();   // block scrolling/pinch
        running = true;
    }, { passive: false });

    svg.addEventListener("touchend", (e) => {
        running = false;
    }, { passive: false });

    svg.addEventListener("touchcancel", (e) => {
        running = false;
    }, { passive: false });
}



function DrawAxes()
{
    let topy   = {x: -9, y: 9};
    let boty   = {x: -9, y: -9};
    let leftx  = {x: -9, y: 0};
    let rightx = {x: 2, y: 0};

    let arrLen = 0.3;
 
    // Main axes
    Line(leftx, rightx, "black", 0.04, false); // X axis
    Line(boty, topy, "black", 0.04, false);    // Y axis

    // Arrowheads for +Y
    Line({x: topy.x - arrLen, y: topy.y - arrLen}, topy, "black", 0.04, false);
    Line({x: topy.x + arrLen, y: topy.y - arrLen}, topy, "black", 0.04, false);

    // Arrowheads for -Y
    Line({x: boty.x - arrLen, y: boty.y + arrLen}, boty, "black", 0.04, false);
    Line({x: boty.x + arrLen, y: boty.y + arrLen}, boty, "black", 0.04, false);

    // Arrowheads for +X
    Line({x: rightx.x - arrLen, y: rightx.y + arrLen}, rightx, "black", 0.04, false);
    Line({x: rightx.x - arrLen, y: rightx.y - arrLen}, rightx, "black", 0.04, false);

    addLabel(rightx,"$x$", {dx: 0.2, dy: -0.2})
    addLabel(topy, "$y$", {dx : 0.5, dy: -0.3})

}


function DrawGrid()
{
    let delta = USER_X_MAX / GRID_LINES
    let max = USER_Y_MAX

    for (let x = -max; x <= max; x+=delta )
        Line({x: x, y: -max}, {x: x, y: max}, "grey", 0.02, false)

    for (let y = -max; y <= max; y+=delta )
        Line({x: -max, y: y}, {x: max, y: y}, "grey", 0.02, false)

}

// Puts text at the position. Accepts basic latex-style $..$ but only 
// with a single subscript or superscript for now.
function addLabel(pos, textString, props = {}) 
{
    let mergedProps = 
    {
        fontSize: 1,
        dx: 0,
        dy: 0,
        ...props
    }
    let textSVG = document.createElementNS(SVG_NS, "text")
    let shiftedPos= {x: pos.x + mergedProps.dx, y: pos.y + mergedProps.dy}
    let userPos = UserToViewportCoords(shiftedPos)
    textSVG.setAttribute("x", String(userPos.x))
    textSVG.setAttribute("y", String(userPos.y))
    textSVG.setAttribute("font-size", String(mergedProps.fontSize))

    let splitString = textString.split("$")
    log(splitString)
    for (let i = 0; i < splitString.length; i++)
    {
        let inMathMode = (i%2 == 1)
        if (!inMathMode)
        {
            let textSpanSVG = document.createElementNS(SVG_NS, "tspan")
            textSpanSVG.setAttribute("font-family", "Latin Modern")
            textSpanSVG.textContent = splitString[i]
            textSVG.appendChild(textSpanSVG)
        }
        else 
        {
            let textSpanSVG = document.createElementNS(SVG_NS, "tspan")
            textSpanSVG.setAttribute("font-family", "Latin Modern Math")
            let math = splitString[i]
            if (math.includes("^"))         // its a superscript string
            {
                log(math + " has a ^")
                let split = math.split("^")
                textSpanSVG.textContent = split[0]
                textSVG.appendChild(textSpanSVG)

                let superscriptSpanSVG = document.createElementNS(SVG_NS, "tspan") 
                superscriptSpanSVG.setAttribute("font-size", "70%")
                superscriptSpanSVG.setAttribute("baseline-shift", "45%")
                superscriptSpanSVG.textContent = split[1]
                textSVG.appendChild(superscriptSpanSVG)

            }
            else if (math.includes("_"))     // its a subscript string
            {
                log(math + " has a _")

                let split = math.split("_")
                textSpanSVG.textContent = split[0]
                textSVG.appendChild(textSpanSVG)

                let superscriptSpanSVG = document.createElementNS(SVG_NS, "tspan") 
                superscriptSpanSVG.setAttribute("font-size", "70%")
                superscriptSpanSVG.setAttribute("baseline-shift", "-25%")
                superscriptSpanSVG.textContent = split[1]
                textSVG.appendChild(superscriptSpanSVG)

            }
            else    // it is just a normal math string, no subscript or superscript
            {
                textSpanSVG.textContent = math
                textSVG.appendChild(textSpanSVG)
            }
        
        }
    }
    log(textSVG.outerHTML)
    svg.appendChild(textSVG)
}

