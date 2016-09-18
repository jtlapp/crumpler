//// CONSTANTS ////////////////////////////////////////////////////////////////

var ELLIPSIS_COUNT = "{n}"; // string substituted for count in collapse

/******************************************************************************
Extent is a class representing a centrally collapsible section of text. It does the work of shortening each extent of text that diff generates.

Extent is stateless, so its methods can be called multiple times to process independent sets of lines.
******************************************************************************/

function Extent(options, config, maxLineLength, bracketSize,
        collapseEllipsis, numberingLines, padWidth)
{
    // all instance variables are private
    this.opts = options;
    this.config = config;
    this.maxLineLength = maxLineLength;
    this.bracketSize = bracketSize;
    this.collapseEllipsis = collapseEllipsis;
    this.numberingLines = numberingLines;
    this.padWidth = padWidth;
}
module.exports = Extent;

//// PUBLIC INSTANCE METHODS //////////////////////////////////////////////////

/**
 * Maximally shorten the text in accordance with the configuration, but only bracket series of lines if bracketSize > 0.
 */
 
Extent.prototype.shorten = function (
        lines, startLineNumber, firstLineDiffOffset, firstLineDiffLength)
{
    if (this.bracketSize > 0 && this.opts.minCollapsedLines > 0) {
        this._shortenText(lines, startLineNumber, firstLineDiffOffset,
                firstLineDiffLength);
    }
    else {
        this._shortenLines(lines, startLineNumber, 0, lines.length,
                firstLineDiffOffset, firstLineDiffLength);
    }
};

//// PRIVATE INSTANCE METHODS /////////////////////////////////////////////////

Extent.prototype._cropEllipsisLength = function (ellipsisInfo, skipLength) {
    if (!ellipsisInfo.showsCount)
        return ellipsisInfo.baseLength;
    return ellipsisInfo.baseLength + Extent.digitCount(
                ellipsisInfo.baseLength + Extent.digitCount(skipLength));
};

Extent.prototype._cropTail = function (line) {
    // only called if maxLineLength > 0 and thus cropping
    var skipLength = line.length - this.maxLineLength;
    if (skipLength <=
            this._cropEllipsisLength(this.config.tailInfo, skipLength))
        return line;
    return line.substr(0, this.maxLineLength) + this._makeEllipsis(
            this.opts.tailCropEllipsis, skipLength);    
};

Extent.prototype._makeCollapseEllipsis = function (
        startLineNumber, removedLineCount)
{
    var collapseEllipsis = this.collapseEllipsis;
    var indentWidth = this.padWidth;
    if (this.numberingLines && this.opts.indentCollapseEllipses) {
        if (this.opts.lineNumberPadding === null)
            indentWidth = Extent.digitCount(startLineNumber);
        indentWidth += this.opts.lineNumberDelim.length;
        var indent = ' '.repeat(indentWidth);
        if (collapseEllipsis.indexOf("\n") < 0) // be fast when possible
            collapseEllipsis = indent + collapseEllipsis;
        else {
            var lines = collapseEllipsis.split("\n");
            var line;
            for (var i = 0; i < lines.length; ++i) {
                line = lines[i];
                if (line.length > 0)
                    lines[i] = indent + lines[i];
            }
            collapseEllipsis = lines.join("\n");
        }
    }
    return this._makeEllipsis(collapseEllipsis, removedLineCount);
};

Extent.prototype._makeEllipsis = function (replacement, count) {
    return replacement.replace(ELLIPSIS_COUNT, count.toString());
};

Extent.prototype._shortenLineAroundDiff = function (
        line, diffOffset, diffLength)
{
    var head = null;
    var newLineStart = 0;
    var newLineEnd = line.length;
    var skipLength;
    
    // Determine the head ellipsis, if any.
    
    if (this.opts.sameHeadLengthLimit >= 0) {
        skipLength = diffOffset - this.opts.sameHeadLengthLimit;
        if (skipLength >
                this._cropEllipsisLength(this.config.headInfo, skipLength))
        {
            head = this._makeEllipsis(this.opts.headCropEllipsis, skipLength);
            newLineStart = skipLength;
        }
    }
    
    // Determine the tail ellipsis, if any.
    
    var maxLineDiffLength = this.opts.maxLineDiffLength; // for convenience
    if (maxLineDiffLength > 0 && diffLength > maxLineDiffLength)
        newLineEnd = diffOffset + maxLineDiffLength;
    else if (this.opts.sameTailLengthLimit >= 0)
        newLineEnd = diffOffset + diffLength + this.opts.sameTailLengthLimit;
    skipLength = line.length - newLineEnd;
    if (skipLength <=
            this._cropEllipsisLength(this.config.tailInfo, skipLength))
        newLineEnd = line.length;

    // Assemble and return the line.

    var newLine = line.substring(newLineStart, newLineEnd);
    if (head !== null) // more efficient than prepending ''
        newLine = head + newLine;
    if (newLineEnd < line.length)
        newLine += this._makeEllipsis(this.opts.tailCropEllipsis, skipLength);
    
    return newLine;
};

Extent.prototype._shortenLines = function(lines, startNumber, startIndex,
        lineCount, firstLineDiffOffset, firstLineDiffLength)
{
    var line; // transforms from original line to shrunken line
    var lineNumber = startNumber; // change names for clarity
    var lineIndex = startIndex;
    var paddingWidth; // width of padding for line number
    var endIndex = startIndex + lineCount; // first index not to process
    var firstLine = true;
    
    // Shorten each line in turn.
    
    while (lineIndex < endIndex) {
        line = lines[lineIndex];
    
        // Shorten a line containing a difference around that difference.
        
        if (firstLine && firstLineDiffOffset >= 0) {
            line = this._shortenLineAroundDiff(line,
                            firstLineDiffOffset, firstLineDiffLength);
            firstLine = false;
        }
        
        // Shorten other lines to the maximum line length, if any.
        
        else if (this.maxLineLength > 0)
            line = this._cropTail(line);
        
        // Prefix the line number when numbering.
        
        if (this.numberingLines) {
            numberStr = lineNumber.toString();
            if (this.opts.lineNumberPadding !== null) {
                paddingWidth = this.padWidth - numberStr.length;
                numberStr = this.config.paddingByWidth[paddingWidth] +
                        numberStr;
            }
            line = numberStr + this.opts.lineNumberDelim + line;
            ++lineNumber;
        }
        
        lines[lineIndex++] = line;
    }
}

Extent.prototype._shortenText = function (
        lines, startLineNumber, firstLineDiffOffset, firstLineDiffLength)
{
    var totalLines = lines.length;

    // Just number and shorten the lines, as required, if the text isn't long
    // enough to bracket.
    
    if (totalLines < 2 * this.bracketSize + this.opts.minCollapsedLines) {
        this._shortenLines(lines, startLineNumber, 0, totalLines,
                firstLineDiffOffset, firstLineDiffLength);
    }

    // Collapse all but the first and last bracketSize count of lines,
    // numbering and shortening the lines as required.

    else {
        // to get line numbers right, process trailing bracket before splicing
        this._shortenLines(lines,
                totalLines - this.bracketSize + startLineNumber,
                totalLines - this.bracketSize, this.bracketSize,
                firstLineDiffOffset, firstLineDiffLength);
        var removedLineCount = totalLines - 2 * this.bracketSize;
        var collapseEllipsis =
                this._makeCollapseEllipsis(startLineNumber, removedLineCount);
        lines.splice(this.bracketSize, removedLineCount, collapseEllipsis);
        this._shortenLines(lines, startLineNumber, 0, this.bracketSize, -1);
    }
};

//// PUBLIC CLASS METHODS /////////////////////////////////////////////////////

Extent.digitCount = function (integer) {
    // try to minimize use of resources
    if (integer < 100)
        return (integer < 10 ? 1 : 2);
    if (integer < 10000)
        return (integer < 1000 ? 3 : 4);
    if (integer < 1000000)
        return (integer < 100000 ? 5 : 6);
    // apparently resources aren't an issue
    return integer.toString().length;
};

Extent.getCropInfo = function (replacement) {
    return {
        baseLength: replacement.replace(ELLIPSIS_COUNT, '').length,
        showsCount: (replacement.indexOf(ELLIPSIS_COUNT) >= 0)
    };
};
