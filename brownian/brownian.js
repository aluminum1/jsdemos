import { SetBackgroundGradient, SetBackgroundColor, MakeRectangle, Rectangle, UserToViewportCoords, Line, MakePolyLine, SetPoints, AddPoint, DrawGrid, svg, userToScreen, initSVG, DrawAxes} from "../modules/svg-draw.js"
import {assert, log} from "../modules/misc-tools.js"
import { AddDataValue, TotalValuesInBins, MaxValueInBins, MakeHistogramView, GetDimensions, RefreshSVG} from "../modules/histogram.js"


// User coordinates run from -10 to 10 left to right
// and from -10 to 10 bottom to top.
const USER_X_MAX = 10
const USER_Y_MAX = 10

const LENGTH_OF_PATH = 100
const DELTA_X = USER_X_MAX / LENGTH_OF_PATH
const DELTA_Y = USER_Y_MAX / LENGTH_OF_PATH
const NUM_BINS = 100

let svgElement = document.getElementById("svgRoot")
initSVG(svgElement, USER_X_MAX, USER_Y_MAX)

DrawGrid(USER_X_MAX)
 DrawAxes()

svg.addEventListener("contextmenu", (e) => e.preventDefault());


let curPoints = [{x: -USER_X_MAX, y: 0}]
let curPolyLine = MakePolyLine(curPoints)
let globalTime, timeFirstPushed = 0
let startNewPathOnNextTick = true
let histogramView;


SetBackgroundGradient("rgb(200,230,230)", "rgb(255, 255, 255)")
SetUpKeyListeners()
InitializeHistogram()


//@ts-ignore
window.histogramView = histogramView

const SIM_TICKS_PER_SECOND = 10_100_000 // (10 million!!! The 100 is there to prevent weird roundoff, I think having to do with bigints...)

const SIM_DT = 1000 / SIM_TICKS_PER_SECOND // The budget each sim tick has to run
let simAccumulator = 0 // How much cash you have on hand to spend
let lastTime = performance.now()
let milliSecondsElapsedSinceLastFrame = 0
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
    milliSecondsElapsedSinceLastFrame = now - lastTime
    lastTime = now
 
    if (running)
    {
        simAccumulator += milliSecondsElapsedSinceLastFrame 

        while (simAccumulator >= SIM_DT) {
            SimulateOneTick()
            simAccumulator -= SIM_DT
         }
        //SimulateOneTick()
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
        if (e.code === "ArrowRight")
        {
            SimulateOneTick()
        }
        else if (e.code === "Space") 
        {
            running = true;
        }
    });

    document.addEventListener("keyup", (e) => {
        if (e.code === "Space") {
            running = false;
        }
    });

    // === Mouse ===
    svg.addEventListener("mousedown", (e) => {
        if (e.button == 0) {  // left mouse button
            SimulateOneTick()
        }
        else if (e.button == 2) // right mouse button
        {
            log("mouse button 2 mousedown")
            running = true
        }
    });

    document.addEventListener("mouseup", (e) => {
        if (e.button == 2) {
            e.preventDefault()
            log("mouse button 2 mouseup")
            running = false;
        }
        if (e.button == 1) {
            log("mouse button 1 mouseup")
        }
    });

    // === Touch (mobile) ===
    svg.addEventListener("touchstart", (e) => {
        e.preventDefault();   // block scrolling/pinch
        let numTouches = e.touches.length
        if (numTouches == 1)
        {
            SimulateOneTick()
        }
        else if (numTouches == 2)
        {
            running = true
        }
    }, { passive: false });

    svg.addEventListener("touchend", (e) => {
        running = false;
    }, { passive: false });

    svg.addEventListener("touchcancel", (e) => {
        running = false;
    }, { passive: false });
}





