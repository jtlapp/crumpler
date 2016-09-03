//// CONSTANTS ////////////////////////////////////////////////////////////////

var COLLAPSE_COUNT_MACRO = "{n}"; // string substituted for count in collapse

/******************************************************************************
Extent is a class representing a centrally collapsible section of text. It does the work of shortening each extent of text that diff generates.

Extent is stateless, so its methods can be called multiple times to process independent sets of lines.
******************************************************************************/

function Extent(options, config, maxLineLength, sameLength, collapsedLines,
        numberingLines, padWidth)
{
    // all instance variables are private
    this.opts = options;
    this.config = config;
    this.sameLength = sameLength;
    this.maxLineLength = maxLineLength;
    this.collapsedLines = collapsedLines;
    this.numberingLines = numberingLines;
    this.padWidth = padWidth;
}
module.exports = Extent;

//// PUBLIC INSTANCE METHODS //////////////////////////////////////////////////

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
                        numberStr + this.opts.lineNumberDelim;
            }
        }
        
        // Shorten the line if configured to do so and necessary. If an offset
        // is given for the first differing character, shorten the first line
        // around the point of difference as indicated by sameLength.
        
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
    var bracketSize = this.opts.bracketSize; // for convenience

    // Just number and shorten the lines, as required, if the text isn't long
    // enough to bracket.
    
    if (totalLines < 2 * bracketSize + this.opts.minCollapseLines) {
        this.shortenLines(lines, 0, startLineNumber, totalLines,
                firstLineDiffOffset);
    }

    // Collapse all but the first and last bracketSize count of lines,
    // numbering and shortening the lines as required.

    else {
        // to get line numbers right, process trailing bracket before splicing
        this.shortenLines(lines, totalLines - bracketSize,
                totalLines - bracketSize + startLineNumber, bracketSize,
                firstLineDiffOffset, 0);
        var removedLineCount = totalLines - 2 * bracketSize;
        var collapsedLines =
                this._makeCollapsedLines(startLineNumber, removedLineCount);
        lines.splice(bracketSize, removedLineCount, collapsedLines);
        this.shortenLines(lines, 0, startLineNumber, bracketSize, 0);
    }
};

//// PRIVATE INSTANCE METHODS /////////////////////////////////////////////////

Extent.prototype._collapsedEndLineLength = function (
        lineLength, maxLineLength)
{
    if (!this.config.lineEndInfo.showsCount)
        return maxLineLength - this.config.lineEndInfo.baseLength;
    var remainderDigits = Extent.digitCount(lineLength - maxLineLength);
    var newLineLength = maxLineLength - this.config.lineEndInfo.baseLength -
            remainderDigits;
    if (Extent.digitCount(lineLength - newLineLength) > remainderDigits)
        --newLineLength; // make room for additional digit of char count
    return (newLineLength < 0 ? 0 : newLength);
}

Extent.prototype._collapsedText = function (replacement, count) {
    return replacement.replace(COLLAPSE_COUNT_MACRO, count.toString());
};

Extent.prototype._makeCollapsedLines = function (
        startLineNumber, removedLineCount)
{
    var collapsedLines = this.collapsedLines;
    var indentWidth = this.padWidth;
    if (this.numberingLines && this.opts.indentCollapsedLines) {
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
    if (this.sameLength >= 0)
        skipLength = lineDiffOffset - this.sameLength;
        
    // In this case, the first different character is approximately centered
    // on the collapsed line. Priority is given to showing more non-collapsed
    // characters over accurately centering the first different character. No
    // correction is made to better center the first differing character for 
    // the case where the collapse replacement strings show character counts
    // of differing numbers of digits -- not worth the cost in clock cycles.

    else
        skipLength = lineDiffOffset - Math.floor(maxLineLength/2);
    
    // If the collapsed start includes a count of the number of characters
    // removed, the computation to determine whether collapsing provides a
    // benefit is a bit complicated. Offload it to keep this method clean.
    
    if (!this._skippingMoreThanCollapsed(skipLength))
        return this._shortenLineEnd(line, shift);
        
    // Collapsing just the start of the line may be sufficient to bring the
    // line under maxLineLength.
    
    var start = this._collapsedText(this.config.collapsedStartLine, skipLength);
    var remainderLength = line.length - skipLength + start.length;
    if (remainderLength <= maxLineLength)
        return start + line.substr(skipLength);

    // Collapse both the start and the end of the line.

    var truncatedLength =
            this._collapsedEndLineLength(remainderLength, maxLineLength);
    var newLineEnd = line.length - truncatedLength;
    if (skipLength > newLineEnd) // if maxLineLength too small for notation,
        skipLength = newLineEnd; //  show only collapses on too-long a line
        
    return start + line.substring(skipLength, newLineEnd) +
            this._collapsedText(this.config.collapsedEndLine, truncatedLength);
};

Extent.prototype._shortenLineEnd = function (line, shift) {
    // only called if this.maxLineLength > 0
    var maxLineLength = this.maxLineLength - shift;
    if (line.length <= maxLineLength)
        return line;
    var newLength = this._collapsedEndLineLength(line.length, maxLineLength);
    return line.substr(0, newLength) + this._collapsedText(
            this.config.collapsedEndLine, line.length - newLength);    
};

Extent.prototype._skippingMoreThanCollapsed = function (skipLength) {
    var collapseLength = this.config.lineStartInfo.baseLength; // convenience
    if (skipLength <= collapseLength)
        return false;
    if (!this.config.lineStartInfo.showsCount)
        return true;
    var skipDigits = Extent.digitCount(skipLength);
    if (Extent.digitCount(collapseLength + skipDigits) > skipDigits)
        ++skipDigits; // make room for additional digit of char count
    return (skipLength > collapseLength + skipDigits);
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
