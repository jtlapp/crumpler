/******************************************************************************
Tool for making lengthy text suitable for line-by-line visual comparison, particularly for use in the tap test harness and the subtap test runner.
******************************************************************************/

//// MODULES //////////////////////////////////////////////////////////////////

var diff = require('diff');
var _ = require('lodash');
var Extent = require('./lib/Extent');

//// CONSTANTS ////////////////////////////////////////////////////////////////

var DEFAULT_COLLAPSED_SAME_LINES   = "  ...";
var DEFAULT_COLLAPSED_WANTED_LINES = "   ...";
var DEFAULT_COLLAPSED_FOUND_LINES  = "    ...";
var DEFAULT_COLLAPSED_LINE_START = "[{n} chars...]";
var DEFAULT_COLLAPSED_LINE_END   = "[...{n} chars]";

/******************************************************************************
The Crumpler class is the public interface. It can collapse a sequence of lines into a configured abbreviation for that sequence, and it can collapse very long lines at the start and end into short representations for the characters removed. Characters are collapsed from the start and end of a line when the difference between mismatching found and wanted lines is somewhere in the middle of the line. The options for collapsing individual lines are provided to the methods. The following option governs collapsing sequences of lines:

  bracketSize: Number of lines to show on each side of a sequence of lines that
    has been collapsed. Must be >= 1. (default 3)
  minCollapseLines: Minimum number of lines that can be removed from a collapsed
    sequence of lines. If a collapse would not removed at least this many lines,
    the sequence of lines does not collapse. Must be >= 2. (default 2)

This set of options provides replacement text for text that is removed in the process of shortening long text. Each of these options may optionally contain a "{n}" placeholder for a number. The options that collapse across lines will replace "{n}" with the number of lines removed, and the options that collapse within a line will replace "{n}" with the number of characters removed. The number of lines removed is always at least 2, and the number of characters removed from a line is at least the length of its replacement text, so any language in the replacement strings can assume a plurality.

  collapsedSameLines: line(s) replacing collapsed non-differing lines
  collapsedWantedLines: lines(s) replacing collapsed wanted lines not found
  collapsedFoundLines: line(s) replacing collapsed found lines not wanted
  collapsedStartLine: string replacing collapsed start of long line
  collapsedEndLine: string replacing collapsed end of long line
  indentCollapsedLines: true => indent collapsed lines by the padded width of
    the last output line number + lineNumberDelim.length (default true)
  
collapsedSameLines, collapsedWantedLines, and collapsedFoundLines need not all be different, but they should all be different. Making them distinct from one another helps any downstream tool that diffs the collapsed strings to properly identify changes. Otherwise the tool may assume collapsed lines are unchanged. Any of these collapse replacement strings may also be empty.

In addition to shortening the text, lines can be numbered. It's useful to number lines when lines are removed so that shown lines can be properly identified. This set of options controls line numbering:

  minNumberedLines: Minimum number of lines that the text must have in order
    for the lines to be numbered. 0 disables line numbering. When two strings
    are compared, both are numbered if either meets this minimum. (default 2)
  lineNumberPadding: Char for left-padding line numbers to make them all have
    the same width. When two strings are being compared, line numbers are
    padded to the greater of their width requirements. Set to null or '' to
    disable left-padding. (default null)
  lineNumberDelim: Delimeter that follows each line number. May be null or ''
    to insert no delimeter. (default ":")
    
These options are more a function of personal preference than the needs of testing, so the developer installs a set of preferences on an instance of tap instead of providing a preferences object to each of the tap assertions.
******************************************************************************/

//// CONFIGURATION ////////////////////////////////////////////////////////////

// opts - options provided at construction
// config - configuration values derived from opts:
//   lineStartInfo: precomputed information about collapsedStartLine
//   lineEndInfo: precomputed information about collapsedEndLine
//   paddingByLength: array of padding strings indexed by padding length

//// CONSTRUCTION /////////////////////////////////////////////////////////////

/**
 * Construct a configured instance of the module.
 *
 * @param options An object configured as described above.
 */
 
function Crumpler(options) {
    if(!(this instanceof Crumpler)) // allow instantiation without "new"
        return new Crumpler(options);
    
    options = options || {};
    if (!_.isInteger(options.bracketSize))
        options.bracketSize = 3;
    else if (options.bracketSize < 1)
        options.bracketSize = 1;
    if (!_.isInteger(options.minCollapseLines))
        options.minCollapseLines = 2;
    else if (options.minCollapseLines < 2)
        options.minCollapseLines = 2;
    if (!_.isString(options.collapsedSameLines))
        options.collapsedSameLines = DEFAULT_COLLAPSED_SAME_LINES;
    if (!_.isString(options.collapsedWantedLines))
        options.collapsedWantedLines = DEFAULT_COLLAPSED_WANTED_LINES;
    if (!_.isString(options.collapsedFoundLines))
        options.collapsedFoundLines = DEFAULT_COLLAPSED_FOUND_LINES;
    if (!_.isString(options.collapsedStartLine))
        options.collapsedStartLine = DEFAULT_COLLAPSED_LINE_START;
    if (!_.isString(options.collapsedEndLine))
        options.collapsedEndLine = DEFAULT_COLLAPSED_LINE_END;
    if (!_.isBoolean(options.indentCollapsedLines))
        options.indentCollapsedLines = true;
    if (!_.isInteger(options.minNumberedLines))
        this.opts.minNumberedLines = 2;
    if (_.isUndefined(options.lineNumberPadding))
        options.lineNumberPadding = null;
    else if (options.lineNumberPadding === '')
        options.lineNumberPadding = null;
    if (options.lineNumberDelim === null)
        options.lineNumberDelim = '';
    else if (!_.isString(options.lineNumberDelim))
        options.lineNumberDelim = ':';
        
    var config = {};
    config.lineStartInfo = Extent.getCollapseInfo(options.collapsedStartLine);
    config.lineEndInfo = Extent.getCollapseInfo(options.collapsedEndLine);
        
    config.paddingByLength = null;
    var padding = options.lineNumberPadding;
    if (padding !== null) {
        // this padding cache is more resource-efficient than _.padStart()
        for (var i = 0; i < 10; ++i)
            config.paddingByLength[i] = padding.repeat(i); //works for i==0 too
    }

    this.opts = options; // bundled for easy passing to TextSection
    this.config = config;
}
module.exports = Crumpler;

//// PUBLIC METHODS ///////////////////////////////////////////////////////////

/**
 * 
 */

Crumpler.prototype.addAsserts = function (tap) {

};

/**
 * Shorten the individual lines of the text without removing any lines. Lines longer than the maximum length are collapsed at the ends as configured. Also number the lines according to the configuration.
 *
 * @param text String containing one or more lines to shorten. LFs ("\n") are assumed to delimit lines, so a trailing LF indicates a blank line.
 * @param maxLineLength Maxinum characters allowed in a line, including added line numbers. 0 allows lines to be of unlimited length. (default 0)
 * @returns a String of the text with lines shortened as specified
 */

Crumpler.prototype.shortenLines = function (text, maxLineLength) {
    if (_.isUndefined(maxLineLength))
        maxLineLength = 0;
    var lines = toLinesWithOptionalLF(text);
    var extent = new Extent(
            this.opts, this.config, maxLineLength, 0, null,
            this._isNumberingLines(lines.length),
            Extent.digitCount(lines.length)
        );
    extent.shortenLines(lines, 0, 1, lines.length, 0);
    return toTextWithOptionalLF(lines, text);
};

/**
 * Shorten the entire text, both reducing the number of lines and the lengths of the individual lines, according to the configuration. Also number the lines according to the configuration. Collapses sequences of lines as well as the ends of lines that exceed the indicated maximum line length.
 *
 * @param text String of one or more lines of text to shorten.
 * @param maxLineLength Maxinum characters allowed in a line, including added line numbers. 0 allows lines to be of unlimited length. (default 0)
 * @returns a String of the text shortened as specified
 */

Crumpler.prototype.shortenText = function (text, maxLineLength)
{
    if (_.isUndefined(maxLineLength))
        maxLineLength = 0; // no line length limit
    var lines = toLinesWithOptionalLF(text);
    var extent = new Extent(
            this.opts, this.config, maxLineLength, 0,
            this.opts.collapsedSameLines,
            this._isNumberingLines(lines.length),
            Extent.digitCount(lines.length)
        );
    extent.shortenText(lines, 1, 0);
    return toTextWithOptionalLF(lines, text);
};

/**
 * Shorten the found and wanted text strings to minimal representations that clearly show differences between them. Returns a collapsed found value and a collapsed wanted value that themselves can be compared using a diffing tool to properly highlight their differences. The method reduces both the number of lines and the lengths of individual lines, according to the configuration. It also numbers the lines in accordance with the configuration.
 *
 * If line numbers are being added to the shortened text, and if the line numbers of the found and wanted values disagre on any lines, a diffing tool that subsequently compares the values will have to be smart enough to ignore the line numbers, unless they are removed prior to diffing.
 *
 * @param found The found text string.
 * @param wanted The wanted text string.
 * @param maxLineLength Maxinum characters allowed in a line, including added line numbers. 0 allows lines to be of unlimited length. (default 0)
 * @param sameLength When a line of the found value differs from a line of the wanted value, and when maxLineLength is non-zero, the two corresponding lines can be collapsed analogously to ensure that at least the first different character is shown within the collapsed line. When sameLength is -1, this first character is approximately centered within the collapsed line. When sameLength >= 1, at most a number of characters equal to sameLength is presented prior to the first differing character.
 * @returns An object {found, wanted} containing the collapsed found text and the collapsed wanted text, shortened to optimize comparing their differences.
 */

Crumpler.prototype.shortenTextToDiffs = function (
        found, wanted, maxLineLength, sameLength)
{
    if (_.isUndefined(maxLineLength))
        maxLineLength = 0; // unlimited line lengths
    if (_.isUndefined(sameLength))
        sameLength = -1; // center first differing char
        
    // If there are no diffs, short-circuit returning identically
    // shortened values.
    
    if (found === wanted) {
        wanted = exports.shortenText(wanted, maxLineLength);
        return { found: wanted, wanted: wanted };
    }
    
    // Just shorten the wanted value if the found value isn't a string
    
    if (typeof found !== 'string') {
        wanted = exports.shortenText(wanted, maxLineLength);
        return { found: found, wanted: wanted };
    }
    
    // Generate the differences between the found and wanted values, with
    // the resulting deltas show how to turn wanted into found.
    
    var deltas = diff.diffLines(wanted, found);

    // Determine whether we're numbering lines and determine the line
    // number padding, without wasting resources splitting on "\n",
    // because these strings are potentially large.
    
    var foundLineCount = 0;
    var wantedLineCount = 0;
    deltas.forEach(function (delta) {
        if (delta.removed)
            wantedLineCount += delta.count;
        else if (delta.added)
            foundLineCount += delta.count;
        else {
            wantedLineCount += delta.count;
            foundLineCount += delta.count;
        }
    });
    
    var minNumberedLines = this.opts.minNumberedLines;
    var numberingLines = (minNumberedLines > 0 &&
            (minNumberedLines === 1
                || foundLineCount >= minNumberedLines
                || wantedLineCount >= minNumberedLines)
        );
    var padWidth = Extent.digitCount(foundLineCount > wantedLineCount ?
                        foundLineCount : wantedLineCount);
    
    // Separately collapse each delta produced by the diffing tool,
    // accumulating the collapsed lines in foundLines and wantedLines.
    
    var foundLines = []; // found lines collected from deltas
    var wantedLines = []; // wanted lines collected from deltas
    var foundLineNumber = 1;
    var wantedLineNumber = 1;
    var lineDiffOffset = 0; // offset to first diff in adjacent found/wanted
    var delta, deltaLines, extent, deltaLinesCopy;
    
    for (var i = 0; i < deltas.length; ++i) {
        delta = deltas[i];
        deltaLines = toLinesWithOptionalLF(delta.value);
        
        // handle a sequence of lines removed from the wanted value
        
        if (delta.removed) {
            lineDiffOffset = 0;
            if (i + 1 < deltas.length && deltas[i + 1].added) {
                // offset guaranteed to be within the first line of value
                lineDiffOffset =
                        firstDiffIndex(delta.value, deltas[i + 1].value);
            }
            extent = new Extent(
                    this.opts, this.config, maxLineLength, sameLength,
                    this.opts.collapsedWantedLines, numberingLines, padWidth
                );
            extent.shortenText(deltaLines, wantedLineNumber, lineDiffOffset);
            deltaLines.forEach(function (line) {
                wantedLines.push(line); // Array::concat() seems wasteful
            });
            wantedLineNumber += deltaLines.length;
        }
        
        // handle a sequence of lines added to the found value
        
        else if (delta.added) {
            extent = new Extent(
                    this.opts, this.config, maxLineLength, sameLength,
                    this.opts.collapsedFoundLines, numberingLines, padWidth
                );
            extent.shortenText(deltaLines, foundLineNumber, lineDiffOffset);
            deltaLines.forEach(function (line) {
                foundLines.push(line); // Array::concat() seems wasteful
            });
            foundLineNumber += deltaLines.length;
        }
        
        // handle a sequence of lines common to both found and wanted
        
        else {
            extent = new Extent(
                    this.opts, this.config, maxLineLength, sameLength,
                    this.opts.collapsedSameLines, numberingLines, padWidth
                );
            if (foundLineNumber === wantedLineNumber) {
                extent.shortenText(deltaLines, foundLineNumber, 0);
                deltaLines.forEach(function (line) {
                    wantedLines.push(line); // Array::concat() seems wasteful
                    foundLines.push(line);
                });
            }
            else {
                deltaLinesCopy = deltaLines.slice(0);
                extent.shortenText(deltaLines, foundLineNumber, 0);
                deltaLines.forEach(function (line) {
                    wantedLines.push(line); // Array::concat() seems wasteful
                });
                extent.shortenText(deltaLinesCopy, foundLineNumber, 0);
                deltaLinesCopy.forEach(function (line) {
                    foundLines.push(line);
                });
            }
            wantedLineNumber += deltaLines.length;
            foundLineNumber += deltaLines.length;
        }
    }
    
    // Construct the collapsed found and wanted values, mimicking any
    // trailing LF of the corresponding originally-provided value.
    
    return {
        found: toTextWithOptionalLF(foundLines, found),
        wanted: toTextWithOptionalLF(wantedLines, wanted)
    };
};

//// PRIVATE METHODS //////////////////////////////////////////////////////////

Crumpler.prototype._isNumberingLines = function (lineCount) {
    if (this.opts.minNumberedLines === 0)
        return false;
    return (lineCount >= this.opts.minNumberedLines);
};

//// ASSERTIONS ///////////////////////////////////////////////////////////////

function linesEqual(found, wanted) {
}

function linesNotEqual(notWanted) {
}

//// SUPPORT FUNCTIONS ////////////////////////////////////////////////////////

function firstDiffIndex(found, wanted) {
    // assumes that there is a difference
    var baseLength = found.length;
    if (baseLength > wanted.length)
        baseLength = wanted.length;
    var i = 0;
    while (i < baseLength && found[i] === wanted[i])
        ++i;
    return i;
}

function toLinesWithOptionalLF(text) {
    var lines = text.split("\n");
    if (lines[lines.length - 1] === '')
        lines.pop(); // consider a trailing LF to be part of the line
    return lines;
}

function toTextWithOptionalLF(lines, originalText) {
    var text = lines.join("\n");
    if (originalText[originalText.length - 1] === "\n")
        return text +"\n";
    return text;
}