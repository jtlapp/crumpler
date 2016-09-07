//// CONSTANTS ////////////////////////////////////////////////////////////////

var COLLAPSE_COUNT_MACRO = "{n}"; // string substituted for count in collapse

/******************************************************************************
Extent is a class representing a centrally collapsible section of text. It does the work of shortening each extent of text that diff generates.

Extent is stateless, so its methods can be called multiple times to process independent sets of lines.
******************************************************************************/

function Extent(options, config, maxLineLength, bracketSize,
        collapsedLines, numberingLines, padWidth)
{
    // all instance variables are private
    this.opts = options;
    this.config = config;
    this.maxLineLength = maxLineLength;
    this.bracketSize = bracketSize;
    this.collapsedLines = collapsedLines;
    this.numberingLines = numberingLines;
    this.padWidth = padWidth;
}
module.exports = Extent;

//// PUBLIC INSTANCE METHODS //////////////////////////////////////////////////

/**
 * Maximally shorten the text in accordance with the configuration, but only bracket series of lines if bracketSize > 0.
 */
 
Extent.prototype.shorten = function (
        lines, startLineNumber, firstLineDiffOffset)
{
    if (this.bracketSize > 0)
        this.shortenText(lines, startLineNumber, firstLineDiffOffset);
    else {
        this.shortenLines(lines, 0, startLineNumber, lines.length,
                firstLineDiffOffset);
    }
};

/**
 * Shorten the lengths of the individual lines in accordance with the configuration, without removing lines. Lines are also numbered as configured.
 */

Extent.prototype.shortenLines = function(lines, startIndex, startNumber,
        lineCount, firstLineDiffOffset)
{
    var line; // transforms from original line to shrunken line
    var lineNumber = startNumber; // change names for clarity
    var lineIndex = startIndex;
    var paddingWidth; // width of padding for line number
    var numberStr = ''; // default in case not numbering
    var endIndex = startIndex + lineCount; // first index not to process
    var shift; // length by which line number shifts remainder of line
    var firstLine = true;
    
    while (lineIndex < endIndex) {
        line = lines[lineIndex];
    
        // Determine the line numbering prefix before shortening the line, in
        // order to factor its length into the full line length.
    
        if (this.numberingLines) {
            numberStr = lineNumber.toString();
            if (this.opts.lineNumberPadding !== null) {
                paddingWidth = this.padWidth - numberStr.length;
                numberStr = this.config.paddingByWidth[paddingWidth] +
                        numberStr;
            }
            numberStr += this.opts.lineNumberDelim;
        }
        
        // Shorten the line if configured to do so and necessary. If an offset
        // is given for the first differing character, shorten the first line
        // around the point of difference as indicated by sameHeadLengthLimit.
        
        if (this.maxLineLength > 0) {
            shift = numberStr.length;
            if (firstLine && firstLineDiffOffset > 0) {
                line = this._shortenLine(line, shift, firstLineDiffOffset);
                firstLine = false;
            }
            else
                line = this._shortenLineEnd(line, shift);
        }
        
        // Prefix the line number after the line has been shortened. The line
        // will have been shortened enough to accommodate the line number and
        // still not exceed maxLineLength.
        
        if (this.numberingLines) {
            line = numberStr + line;
            ++lineNumber;
        }
        
        lines[lineIndex++] = line;
    }
}

/**
 * Shorten both the number of lines and the lengths of the individual lines, in accordance with the configuration. Lines are also numbered as configured.
 */

Extent.prototype.shortenText = function (
        lines, startLineNumber, firstLineDiffOffset)
{
    var totalLines = lines.length;

    // Just number and shorten the lines, as required, if the text isn't long
    // enough to bracket.
    
    if (totalLines < 2 * this.bracketSize + this.opts.minCollapsedLines) {
        this.shortenLines(lines, 0, startLineNumber, totalLines,
                firstLineDiffOffset);
    }

    // Collapse all but the first and last bracketSize count of lines,
    // numbering and shortening the lines as required.

    else {
        // to get line numbers right, process trailing bracket before splicing
        this.shortenLines(lines, totalLines - this.bracketSize,
                totalLines - this.bracketSize + startLineNumber,
                this.bracketSize, firstLineDiffOffset, 0);
        var removedLineCount = totalLines - 2 * this.bracketSize;
        var collapsedLines =
                this._makeCollapsedLines(startLineNumber, removedLineCount);
        lines.splice(this.bracketSize, removedLineCount, collapsedLines);
        this.shortenLines(lines, 0, startLineNumber, this.bracketSize, 0);
    }
};

//// PRIVATE INSTANCE METHODS /////////////////////////////////////////////////

Extent.prototype._tailCropEllipsisLength = function (
        lineLength, maxLineLength)
{
    // if both the line and its replacement text exceed maxLineLength, show
    // the replacement text anyway, because it may include a character count
    // that would help the user realize that maxLineLength is too low
     
    var newLineLength = maxLineLength - this.config.tailInfo.baseLength;
    if (this.config.tailInfo.showsCount) {
        var remainderDigits = Extent.digitCount(lineLength - maxLineLength);
        newLineLength -= remainderDigits;
        if (Extent.digitCount(lineLength - newLineLength) > remainderDigits)
            --newLineLength; // make room for additional digit of char count
    }
    return (newLineLength < 0 ? 0 : newLineLength);
}

Extent.prototype._collapsedText = function (replacement, count) {
    return replacement.replace(COLLAPSE_COUNT_MACRO, count.toString());
};

Extent.prototype._makeCollapsedLines = function (
        startLineNumber, removedLineCount)
{
    var collapsedLines = this.collapsedLines;
    var indentWidth = this.padWidth;
    if (this.numberingLines && this.opts.indentCollapseEllipses) {
        if (this.opts.lineNumberPadding === null)
            indentWidth = Extent.digitCount(startLineNumber);
        indentWidth += this.opts.lineNumberDelim.length;
        var indent = ' '.repeat(indentWidth);
        if (collapsedLines.indexOf("\n") < 0) // be fast when possible
            collapsedLines = indent + collapsedLines;
        else {
            var lines = collapsedLines.split("\n");
            var line;
            for (var i = 0; i < lines.length; ++i) {
                line = lines[i];
                if (line.length > 0)
                    lines[i] = indent + lines[i];
            }
            collapsedLines = lines.join("\n");
        }
    }
    return this._collapsedText(collapsedLines, removedLineCount);
};

Extent.prototype._shortenLine = function (line, shift, lineDiffOffset) {
    // only called if this.maxLineLength > 0

    // Bug out if line is already short enough.

    var maxLineLength = this.maxLineLength - shift;
    if (line.length <= maxLineLength)
        return line;
    
    // Determine the number of characters that would be collapsed from the
    // start of the line. In this first case, the configuration specifies the
    // number of common characters to show before the first one that differs.
        
    var skipLength; // number of chars to collapse from start of line
    if (this.opts.sameHeadLengthLimit >= 0) {
        skipLength = lineDiffOffset - this.opts.sameHeadLengthLimit;
        if (!this._skippingMoreThanCollapsed(skipLength))
            skipLength = 0;
    }
    
    // In this case, the first different character is approximately centered
    // on the collapsed line. Priority is given to showing more non-collapsed
    // characters over accurately centering the first different character. No
    // correction is made to better center the first differing character for 
    // the case where the collapse replacement strings show character counts
    // of differing numbers of digits -- not worth the cost in clock cycles.

    else {
        skipLength = lineDiffOffset - Math.floor(maxLineLength/2);
        skipLength = this._collapsedSkipLength(skipLength);
    }
    
    // If the collapsed start includes a count of the number of characters
    // removed, the computation to determine whether collapsing provides a
    // benefit is a bit complicated. That logic was offloaded above to
    // _skippingMoreThanCollapsed() and _collapsedSkipLength(), resulting
    // in a skipLength of 0 to cancel collapsing at the start of a line.
    
    if (skipLength === 0)
        return this._shortenLineEnd(line, shift);
        
    // Collapsing just the start of the line may bring the line under
    // maxLineLength. We want to show as much of the line as possible, so
    // in this case skip the least that puts the line at maxLineLength.
    
    var start = this._collapsedText(this.opts.headCropEllipsis, skipLength);
    var remainderLength = line.length - skipLength + start.length;
    if (remainderLength <= maxLineLength) {
        var skipLength2 = skipLength - maxLineLength + remainderLength;
        if (this.config.headInfo.showsCount) {
            skipLength2 -= Extent.digitCount(skipLength) -
                    Extent.digitCount(skipLength2);
        }
        start = this._collapsedText(this.opts.headCropEllipsis, skipLength2);
        return start + line.substr(skipLength2);
    }

    // Collapse both the start and the end of the line.

    var newLineEnd = skipLength - start.length +
            this._tailCropEllipsisLength(remainderLength, maxLineLength);
    if (skipLength > newLineEnd) // if maxLineLength too small for notation,
        skipLength = newLineEnd; //  show only collapses on too-long a line
        
    return start + line.substring(skipLength, newLineEnd) +
            this._collapsedText(this.opts.tailCropEllipsis,
                    line.length - newLineEnd);
};

Extent.prototype._shortenLineEnd = function (line, shift) {
    // only called if this.maxLineLength > 0
    var maxLineLength = this.maxLineLength - shift;
    if (line.length <= maxLineLength)
        return line;
    var newLength = this._tailCropEllipsisLength(line.length, maxLineLength);
    return line.substr(0, newLength) + this._collapsedText(
            this.opts.tailCropEllipsis, line.length - newLength);    
};

Extent.prototype._skippingMoreThanCollapsed = function (rightOfSkip) {
    var collapseLength = this.config.headInfo.baseLength;
    if (rightOfSkip <= collapseLength)
        return false;
    if (!this.config.headInfo.showsCount)
        return true;
    var skipDigits = Extent.digitCount(rightOfSkip);
    collapseLength += Extent.digitCount(collapseLength + skipDigits);
    return (rightOfSkip > collapseLength);
};

Extent.prototype._collapsedSkipLength = function (leftOfSkip) {
    // adds collapseLength to leftOfSkip, but also handles leftOfSkip < 0
    var collapseLength = this.config.headInfo.baseLength;
    var skipLength = leftOfSkip + collapseLength;
    if (this.config.headInfo.showsCount) {
        var skipDigits = (skipLength > 0 ? Extent.digitCount(skipLength) : 1);
        skipDigits = Extent.digitCount(collapseLength + skipDigits);
        collapseLength += skipDigits;
        skipLength += skipDigits;
    }
    return (skipLength > collapseLength ? skipLength : 0);
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

Extent.getCollapseInfo = function (replacement) {
    return {
        showsCount: (replacement.indexOf(COLLAPSE_COUNT_MACRO) >= 0),
        baseLength: replacement.replace(COLLAPSE_COUNT_MACRO, '').length
    };
};
