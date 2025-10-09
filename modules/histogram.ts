export {AddDataValue, MakeHistogramView, GetDimensions, RefreshSVG, type HistogramView, type Histogram}
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
    histogram:                  Histogram
    svgRects:                   SVGRectElement[]
    props:                      HistogramViewProps
}

interface HistogramViewProps
{
    basePoint:      Point
    widthScale:     number
    halfThickness:  number
}

interface Histogram
{
    bins:               Bin[]
    totalValuesInBins:  number
}


function AddDataValue(histogram: Histogram, value: number) 
{
    for (let bin of histogram.bins)
        if (value > bin.min && value < bin.max)
        {
            bin.numberInBin++
            histogram.totalValuesInBins++
            return            
        }  
}


// It will make a histogramView, drawn such that the area of each bin is equal to the fraction of data points it contains
function MakeHistogramView(histogram: Histogram, props: Partial<HistogramViewProps> = {}, ctx: SvgContext) : HistogramView
{
    let bins = histogram.bins
    assert(bins.length >= 1)

    let binHeight = bins.length > 0 ? (bins[0]!.max - bins[0]!.min) : 1;

    let mergedProps = {
        basePoint: {x: 0, y:0}, 
        widthScale: 5, 
        halfThickness: binHeight / 2,
        ...props
    }
    
    let svgRects = []
    for (let bin of bins)
    {
        let {topLeft, bottomRight} = GetDimensions(bin, histogram, mergedProps)
        let rect = MakeRectangle(topLeft, bottomRight, "lightgreen", false, ctx)
    
        svgRects.push(rect)
        ctx.svg.appendChild(rect)
    }

    return {histogram, svgRects, props: mergedProps}
}

// Gets the dimensions of a bin in a histogram given the props of the histogramView
function GetDimensions(bin: Bin, histogram: Histogram, props: HistogramViewProps)
{
    let fractionOfTotalValues = histogram.totalValuesInBins > 0 ? bin.numberInBin / histogram.totalValuesInBins : 0
    let {basePoint, widthScale, halfThickness} = props
    let binMiddle = (bin.max + bin.min)/2
    let binWidth = bin.max - bin.min
    let topLeft = {
        x: basePoint.x,
        y: basePoint.y + binMiddle + halfThickness
    }
    let bottomRight = {
        x: basePoint.x + widthScale * fractionOfTotalValues / binWidth,
        y: basePoint.y + binMiddle - halfThickness
    }
    return {topLeft: topLeft, bottomRight: bottomRight}
}

function RefreshSVG(histogramView: HistogramView, ctx: SvgContext) 
{
    assert(ctx)
    let {histogram, svgRects, props} = histogramView

    let bins = histogramView.histogram.bins

    for (let i=0; i < bins.length; i++)
    {
        let bin = bins[i]!
        assert(bins.length = svgRects.length)
        let svgRect = svgRects[i]!
        let {topLeft, bottomRight} = GetDimensions(bin, histogram, props)
        let width = (bottomRight.x - topLeft.x)
        let height = topLeft.y - bottomRight.y
        let screenTopLeft = UserToViewportCoords(topLeft, ctx)
        svgRect.setAttribute("x", String(screenTopLeft.x))
        svgRect.setAttribute("y", String(screenTopLeft.y))
        svgRect.setAttribute("width", String(width))
        svgRect.setAttribute("height", String(height))
    }
}
