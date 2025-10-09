import { Rectangle, Line, type Point, SetSVGContext, DrawGrid, DrawAxes, MakePolyLine, type SvgContext, MakeSVGContext, SetBackgroundGradient, 
    SetPoints, type CoordinateBounds} from "../modules/svg-draw.js"
import {assert, log} from "../modules/misc-tools.js"
import { AddDataValue, MakeHistogramView, RefreshSVG, type HistogramView, 
    type Histogram} from "../modules/histogram.js"


// User coordinates run from -10 to 10 left to right
// and from -20 to 20 bottom to top.
const T = 10                                            // The final time
const HISTOGRAM_WIDTH = 5
const NUM_STEPS = 10                                    // number of steps - keep it even

const DELTA_T = T / NUM_STEPS
const DELTA_B = Math.sqrt(DELTA_T)                      // Brownian motion jump
const r =  0.1                                            // interest rate
const sigma = 0.5                                         // volatility of stock
const S0     = 5                                        // stock price at time zero

const NUM_BROWNIAN_BINS = 50
const NUM_STOCK_BINS    = 50                 // Let's keep it the same...

const BROWNIAN_BOUNDS : CoordinateBounds = {    
    xMin:   0,
    xMax:   T + HISTOGRAM_WIDTH,
    yMin:   -NUM_STEPS * DELTA_B,
    yMax:   NUM_STEPS * DELTA_B
}
 
// const varianceInStockPriceAtFinalTime = S0**2 * Math.exp(2*r + sigma**2)*(Math.exp(sigma**2) - 1)
// const stdDevInStockPriceAtFinalTime = Math.sqrt(varianceInStockPriceAtFinalTime)

const STOCK_BOUNDS : CoordinateBounds = {
    xMin:   0,
    xMax:   T + HISTOGRAM_WIDTH,
    yMin:   0,                   
    yMax:   100           // We'll go up to 2 standard deviations? Should be enough..
}

let brownianSvg = document.querySelector("#svg1") as SVGSVGElement
let brownianCtx = MakeSVGContext(brownianSvg, BROWNIAN_BOUNDS)
let stockSvg = document.querySelector("#svg2") as SVGSVGElement
let stockCtx = MakeSVGContext(stockSvg, STOCK_BOUNDS)

SetBackgroundGradient("rgb(200,230,230)", "rgb(255, 255, 255)", brownianCtx)
DrawGrid(brownianCtx)
DrawAxes(brownianCtx)
SetBackgroundGradient("rgba(188, 80, 96, 1)", "rgb(255, 255, 255)", stockCtx)
DrawGrid(stockCtx)
DrawAxes(stockCtx)

let brownianCurPoints : Point[] = [{x: 0, y: 0}]
let stockCurPoints : Point[] = [{x: 0, y: S0}]

let brownianCurPolyLine = MakePolyLine(brownianCurPoints, {}, brownianCtx)
let stockCurPolyLine = MakePolyLine(stockCurPoints, {color: "red"}, stockCtx)
let startNewPathOnNextTick = true
let brownianHistogramView = InitializeBrownianHistogram(brownianCtx);
let stockHistogramView = InitializeStockHistogram(stockCtx);

let state = {
    running: false, 
    brownianHistogramView, 
    stockHistogramView,
    DELTA_B
}
//@ts-ignore
window.state = state

SetUpKeyListeners()


const SIM_TICKS_PER_SECOND = 10_000 // (Could go up to 10 million at 60fps!!! In that case, for large numbers, have to add nudges to prevent weird behaviour, I think having to do with bigints...)

const SIM_DT = 1000 / SIM_TICKS_PER_SECOND // The budget each sim tick has to run
let simAccumulator = 0 // How much cash you have on hand to spend


// Counters for logging
let lastTime = performance.now()
let milliSecondsElapsedSinceLastFrame = 0
let frameCount= 0
let simCount = 0
let totalSimCount = 0
let lastFpsLog = performance.now()



/*
----------------------------
Function defintions
-----------------------------
*/


function start() {
  if (!state.running) {
    state.running = true;
    requestAnimationFrame(FrameDraw);
  }
}
function stop() {
  state.running = false;
}


function SimulateOneTick() {
    
    if (startNewPathOnNextTick) {
        brownianCurPoints = [{x: 0, y:0}]
        stockCurPoints = [{x: 0, y: S0}]
        startNewPathOnNextTick = false
        return
    }

    assert(brownianCurPoints.length >= 1)
    assert(stockCurPoints.length >= 1)

    let brownianCurPoint = brownianCurPoints[brownianCurPoints.length - 1]!
    let stockCurPoint = stockCurPoints[stockCurPoints.length - 1]!
    let dB = GetRandomBrownianJump()
    let newB = brownianCurPoint.y + dB

    let brownianNewPoint = {
        x: brownianCurPoints.length * DELTA_T, 
        y: newB
    }
    brownianCurPoints.push(brownianNewPoint)

    let t = brownianNewPoint.x
    let newS = S0*Math.exp((r-1/2*sigma**2)*t + sigma*newB)
    // log("newS: ", newS)
  
    let stockNewPoint = {
        x: stockCurPoints.length * DELTA_T,
        y: stockCurPoint.y + newS        
    }

    stockCurPoints.push(stockNewPoint)


    if (brownianCurPoints.length == NUM_STEPS + 1) 
    {
        AddDataValue(brownianHistogramView.histogram, brownianNewPoint.y)
        AddDataValue(stockHistogramView.histogram, stockNewPoint.y)
        startNewPathOnNextTick = true
    }

    simCount++
    totalSimCount++
}

function FrameDraw(now: number) {
    milliSecondsElapsedSinceLastFrame = now - lastTime
    lastTime = now
 
    if (state.running)
    {
        simAccumulator += milliSecondsElapsedSinceLastFrame 

        while (simAccumulator >= SIM_DT) 
        {
            SimulateOneTick()
            simAccumulator -= SIM_DT
        }

        // Log every second while running
        if (now - lastFpsLog >= 1000) 
        {
            log(`FPS: ${frameCount}, SPS: ${simCount}, Total sims: ${totalSimCount}`)
            frameCount = 0
            simCount = 0
            lastFpsLog = now
        }

        SetPoints(brownianCurPolyLine, brownianCurPoints, brownianCtx);
        SetPoints(stockCurPolyLine, stockCurPoints, stockCtx);
        RefreshSVG(brownianHistogramView, brownianCtx);
        RefreshSVG(stockHistogramView, stockCtx);
        requestAnimationFrame(FrameDraw)
    }

    frameCount++

}


function InitializeBrownianHistogram(ctx: SvgContext) : HistogramView
{
    assert(ctx)
    let bins = [];
    let totalWidth = ctx.bounds.yMax - ctx.bounds.yMin
    let binWidth = totalWidth / NUM_BROWNIAN_BINS 
    for (let binCentre = ctx.bounds.yMin; binCentre <= ctx.bounds.yMax; binCentre += binWidth) {
        bins.push({min: binCentre - binWidth/2, max: binCentre + binWidth/2, numberInBin: 0});
    }
    let totalValuesInBins = 0
    let histogram : Histogram = {bins, totalValuesInBins}
    let gaussianHeight = 1/Math.sqrt(2 * Math.PI * T)
    let histogramView = MakeHistogramView(histogram, {basePoint: {x: 10, y:0},  widthScale: 4 / gaussianHeight}, ctx);
    return histogramView
}

function InitializeStockHistogram(ctx: SvgContext) : HistogramView
{
    assert(ctx)
    let bins = [];
    // Let's just try, for now: equally spaced bins up to the top of the viewBox
    let binWidth = ctx.bounds.yMax / NUM_STOCK_BINS  
    for (let y = 0; y < ctx.bounds.yMax; y += binWidth) {
        bins.push({min: y, max: y + binWidth, numberInBin: 0});
    }

    let totalValuesInBins = 0
    let histogram : Histogram = {bins, totalValuesInBins}
    let histogramView = MakeHistogramView(histogram, {basePoint: {x: 10, y: 0}, widthScale: 150}, ctx);
    return histogramView
}

function randomNormal(mean = 0, variance = 1) : number
{
    const stddev = Math.sqrt(variance);
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return mean + z * stddev;
}

function GetRandomBrownianJump() : number
{
    // let randomStep = Math.random() < 0.5 ? -1 : 1
    // return DELTA_B * randomStep
    return randomNormal(0, DELTA_T)
}


function SetUpKeyListeners() 
{
    
    // === Keyboard ===
    document.addEventListener("keydown", (e) =>  {
        if (e.code === "ArrowRight")
        {
            SimulateOneTick()
            SetPoints(brownianCurPolyLine, brownianCurPoints, brownianCtx)
            SetPoints(stockCurPolyLine, stockCurPoints, stockCtx)
            RefreshSVG(brownianHistogramView, brownianCtx)
            RefreshSVG(stockHistogramView, stockCtx)
        }
        else if (e.code === "Space") 
        {
            start()            
        }
    });

    document.addEventListener("keyup", (e) => {
        if (e.code === "Space") {
            stop()
        }
    });

    // // === Mouse ===
    // ctx.svg.addEventListener("mousedown", (e) => {
    //     if (e.button == 0) {  // left mouse button
    //         SimulateOneTick()
    //     }
    //     else if (e.button == 2) // right mouse button
    //     {
    //         log("mouse button 2 mousedown")
    //         state.running = true
    //     }
    // });

    // document.addEventListener("mouseup", (e) => {
    //     if (e.button == 2) {
    //         e.preventDefault()
    //         log("mouse button 2 mouseup")
    //         running = false;
    //     }
    //     if (e.button == 1) {
    //         log("mouse button 1 mouseup")
    //     }
    // });

    // // === Touch (mobile) ===
    // ctx.svg.addEventListener("touchstart", (e) => {
    //     e.preventDefault();   // block scrolling/pinch
    //     let numTouches = e.touches.length
    //     if (numTouches == 1)
    //     {
    //         SimulateOneTick()
    //     }
    //     else if (numTouches == 2)
    //     {
    //         state.running = true
    //     }
    // }, { passive: false });

    // ctx.svg.addEventListener("touchend", (e) => {
    //     running = false;
    // }, { passive: false });

    // ctx.svg.addEventListener("touchcancel", (e) => {
    //     state.running = false;
    // }, { passive: false });
}





