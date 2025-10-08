export {AddDataValue, TotalValuesInBins, MaxValueInBins, MakeHistogramView, GetDimensions, RefreshSVG, type HistogramView}
import {MakeRectangle, UserToViewportCoords, type Point , type SvgContext} from "./svg-draw.js";
import {assert} from "./misc-tools.js"

interface Bin
{
    min:            number
    max:            number
    numberInBin:    number
}

interface HistogramView
{
    bins:       Bin[]
    svgRects:   SVGRectElement[]
    props:      HistogramViewProps
}

interface HistogramViewProps
{
    basePoint:      Point
    widthScale:     number
    halfThickness:  number
}

function AddDataValue(bins: Bin[], value: number) 
{
    for (let bin of bins)
        if (value > bin.min && value < bin.max)
        {
            bin.numberInBin++
            return            
        }
}

function TotalValuesInBins(bins: Bin[]) 
{
    let count = 0;
    bins.forEach(bin => { count += bin.numberInBin})
}

function MaxValueInBins(bins: Bin[]) {
    let maxSoFar = 0;
    for (let bin of bins)
        if (bin.numberInBin > maxSoFar)
            maxSoFar = bin.numberInBin
    return maxSoFar;
}


function MakeHistogramView(bins: Bin[], props: Partial<HistogramViewProps> = {}, ctx: SvgContext) : HistogramView
{
    assert(bins.length >= 1)

    let binHeight = bins.length > 0 ? (bins[0]!.max - bins[0]!.min) : 1;

    let mergedProps = {
        basePoint: {x: 0, y:0}, 
        widthScale: 5, 
        halfThickness: binHeight / 2,
        ...props
    }
    
    let svgRects = []
    let maxValueInBins = MaxValueInBins(bins)
    for (let bin of bins)
    {
        let {topLeft, bottomRight} = GetDimensions(bin, maxValueInBins, mergedProps)
        let rect = MakeRectangle(topLeft, bottomRight, "lightgreen", false)
    
        svgRects.push(rect)
        ctx.svg.appendChild(rect)
    }

    return {bins, svgRects, props: mergedProps}
}

// Gets the dimensions of a bin, given the max of the values in all the bins,
// and the props of the histogramView
function GetDimensions(bin: Bin, maxValueInBins: number, props: HistogramViewProps)
{
    let fractionOfMaxValue = maxValueInBins > 0 ? bin.numberInBin / maxValueInBins : 0
    let {basePoint, widthScale, halfThickness} = props
    let binMiddle = (bin.max + bin.min)/2
    let topLeft = {
        x: basePoint.x,
        y: basePoint.y + binMiddle + halfThickness
    }
    let bottomRight = {
        x: basePoint.x + fractionOfMaxValue * widthScale,
        y: basePoint.y + binMiddle - halfThickness
    }
    return {topLeft: topLeft, bottomRight: bottomRight}
}

function RefreshSVG(histogramView: HistogramView) 
{
    let {bins, svgRects} = histogramView
    let maxValueInBins = MaxValueInBins(histogramView.bins)

    for (let i=0; i< histogramView.bins.length; i++)
    {
        let bin = bins[i]!
        assert(bins.length = svgRects.length)
        let svgRect = svgRects[i]!
        let {topLeft, bottomRight} = GetDimensions(bin, maxValueInBins, histogramView.props)
        let width = (bottomRight.x - topLeft.x)
        let height = topLeft.y - bottomRight.y
        let screenTopLeft = UserToViewportCoords(topLeft)
        svgRect.setAttribute("x", String(screenTopLeft.x))
        svgRect.setAttribute("y", String(screenTopLeft.y))
        svgRect.setAttribute("width", String(width))
        svgRect.setAttribute("height", String(height))
    }
}
