/******************************************************************************
Tool for making lengthy text suitable for line-by-line visual comparison, particularly for use in the tap test harness and the subtap test runner.
******************************************************************************/

//// MODULES //////////////////////////////////////////////////////////////////

var diff = require('diff');
var _ = require('lodash');
var Extent = require('./lib/Extent');

//// CONSTANTS ////////////////////////////////////////////////////////////////

var DEFAULT_COLLAPSED_SAME_ELLIPSIS    = " ...";
var DEFAULT_COLLAPSED_MODEL_ELLIPSIS   = "  ...";
var DEFAULT_COLLAPSED_SUBJECT_ELLIPSIS = "   ...";
var DEFAULT_HEAD_CROP_ELLIPSIS = "[{n} chars...]";
var DEFAULT_TAIL_CROP_ELLIPSIS = "[...{n} chars]";

/******************************************************************************
The Crumpler class abbreviates lengthy text. It can collapse series of lines into a few lines bracketing an ellipsis, and it can truncate long lines. More usefully, it can compare two lengths of text and abbreviate each text so that just the differences between the texts remain, along with some surrounding common context for those differences. These two abbreviated texts can then be run through a diff tool and still properly show all the differences.

This class defines the following terms:

  "collapse" - Reduction of a series of lines into a a few lines that start the series, a few lines that end the series, and an ellipsis in between.
  "bracket" - The lines that start or end a collapse.
  "crop" - Removal of characters from either the head (start) of a line or the tail (end) of a line.
  "ellipsis" - A sequence of characters that replaces either the lines removed from a collapse or the characters removed from a crop.
  "subject" - Text that is being abbreviated, possibly in comparison to a model for purposes of retaining differences with the model in the abbreviation.
  "model" - Text that is being abbreviated in comparison to a subject for purposes of retaining differences with the subject in the abbreviation.
  
Crumpler is also able to number the lines in the abbreviated text with the line numbers of the original text.

Crumpler.addAsserts() extends an instance of 'tap' with test assertions for using Crumpler to compare two strings of text. When numbering lines, these assertions append a lineNumbers extra flag to inform downstream TAP consumers that line numbers are present. For example, this flag informs subtap to render differences between the texts other than differences in line numbers.

See the tap test harness at (http://www.node-tap.org/).
See the subtap test runner at (https://github.com/jtlapp/subtap).
******************************************************************************/

//// CONFIGURATION ////////////////////////////////////////////////////////////

// opts - options provided at construction
// config - configuration values derived from opts:
//   lineStartInfo: precomputed information about headCropEllipsis
//   lineEndInfo: precomputed information about tailCropEllipsis
//   paddingByLength: array of padding strings indexed by padding length

//// CONSTRUCTION /////////////////////////////////////////////////////////////

/**
 * Construct a configured instance of the module.
 

sameBracketSize
diffBracketSize
minCollapsedLines

maxSameLineLength
maxDiffLineLength
maxSameHeadLength
maxSameTailLength

collapsedSameEllipsis
collapsedSubjectEllipsis
collapsedModelEllipsis
headCropEllipsis
tailCropEllipsis


 is the public interface. It can collapse a sequence of lines into a configured abbreviation for that sequence, and it can collapse very long lines at the start and end into short representations for the characters removed. Characters are collapsed from the start and end of a line when the difference between mismatching text1 and text2 lines is somewhere in the middle of the line. The following options govern collapsing sequences of lines:

  bracketSize: Number of lines to show on each side of a sequence of lines that
    has been collapsed. Set to 0 to turn off bracketing, so that lines are not
    removed. Bracketing can also be avoided, regardless of the value of this
    option, by calling shortenLines(). (default 2)
  minCollapsedLines: Minimum number of lines that can be removed from a collapsed
    sequence of lines. If a collapse would not removed at least this many lines,
    the sequence of lines does not collapse. Must be >= 2. (default 2)

The following options govern collapsing individual lines. The methods also accept these values. The values configured here apply during a method call when not passed to the method.

  maxLineLength: The maximum number of characters allowed in a line. Lines are
    collapsed at the start or at the end or at both start and end, depending on
    circumstances, in order to fit the line to this length. The strings that
    replace the collapses are included within this length limit, so that the
    entire line, including collapses do not exceed this limit. Set to 0 to
    eliminate a maximum line length limit. (default 0)
  sameLength: This is the preferred number of characters to display before the
    first differing character when collapsing a line to emphasize differences
    with another line. 0 collapses the line to start at the first different
    character, unless there is room on the line to display more characters
    before the difference. -1 positions the first differing character at about
    the center of the line, when collapsed at both ends. (default -1)

This set of options provides replacement text for text that is removed in the process of shortening long text. Each of these options may optionally contain a "{n}" placeholder for a number. The options that collapse across lines will replace "{n}" with the number of lines removed, and the options that collapse within a line will replace "{n}" with the number of characters removed. The number of lines removed is always at least 2, and the number of characters removed from a line is at least the length of its replacement text, so any language in the replacement strings can assume a plurality.

  collapsedSameEllipsis: line(s) replacing collapsed non-differing lines
  collapsedSubjectEllipsis: line(s) replacing collapsed text1 lines not in text2
  collapsedModelEllipsis: lines(s) replacing collapsed text2 lines not in text1
  headCropEllipsis: string replacing collapsed start of long line
  tailCropEllipsis: string replacing collapsed end of long line
  indentCollapsedLines: true => indent collapsed lines by the padded width of
    the last output line number + lineNumberDelim.length (default false)
  
collapsedSameEllipsis, collapsedModelEllipsis, and collapsedSubjectEllipsis need not all be different, but they should all be different. Making them distinct from one another helps any downstream tool that diffs the collapsed strings to properly identify changes. Otherwise the tool may assume collapsed lines are unchanged. Any of these collapse replacement strings may also be empty.

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

 *
 * @param options An object configured as described above.
 */
 
function Crumpler(options) {
    if(!(this instanceof Crumpler)) // allow instantiation without "new"
        return new Crumpler(options);
    
    options = options || {};
    if (!_.isInteger(options.bracketSize))
        options.bracketSize = 2;
    if (!_.isInteger(options.minCollapsedLines))
        options.minCollapsedLines = 2;
    else if (options.minCollapsedLines < 2)
        options.minCollapsedLines = 2;
    if (!_.isInteger(options.maxLineLength))
        options.maxLineLength = 0;
    if (!_.isInteger(options.sameLength))
        options.sameLength = -1;
    if (!_.isString(options.collapsedSameEllipsis))
        options.collapsedSameEllipsis = DEFAULT_COLLAPSED_SAME_ELLIPSIS;
    if (!_.isString(options.collapsedSubjectEllipsis))
        options.collapsedSubjectEllipsis = DEFAULT_COLLAPSED_SUBJECT_ELLIPSIS;
    if (!_.isString(options.collapsedModelEllipsis))
        options.collapsedModelEllipsis = DEFAULT_COLLAPSED_MODEL_ELLIPSIS;
    if (!_.isString(options.headCropEllipsis))
        options.headCropEllipsis = DEFAULT_HEAD_CROP_ELLIPSIS;
    if (!_.isString(options.tailCropEllipsis))
        options.tailCropEllipsis = DEFAULT_TAIL_CROP_ELLIPSIS;
    if (!_.isBoolean(options.indentCollapsedLines))
        options.indentCollapsedLines = false;
    if (!_.isInteger(options.minNumberedLines))
        options.minNumberedLines = 2;
    if (_.isUndefined(options.lineNumberPadding))
        options.lineNumberPadding = null;
    else if (options.lineNumberPadding === '')
        options.lineNumberPadding = null;
    if (options.lineNumberDelim === null)
        options.lineNumberDelim = '';
    else if (!_.isString(options.lineNumberDelim))
        options.lineNumberDelim = ':';
        
    var config = {};
    config.lineStartInfo = Extent.getCollapseInfo(options.headCropEllipsis);
    config.lineEndInfo = Extent.getCollapseInfo(options.tailCropEllipsis);
        
    config.paddingByWidth = [];
    var padding = options.lineNumberPadding;
    if (padding !== null) {
        // this padding cache is more resource-efficient than _.padStart()
        for (var i = 0; i < 10; ++i)
            config.paddingByWidth[i] = padding.repeat(i); //works for i==0 too
    }

    this.opts = options; // bundled for easy passing to TextSection
    this.config = config;
}
module.exports = Crumpler;

//// PUBLIC METHODS ///////////////////////////////////////////////////////////

/**
 * Adds assertions to an instance of tap that call shortenDiff() on text1 and text2 values for a provided instance of Crumpler. When lines are being numbered, attaches a { lineNumbers: true } option to the tap extra field, which allows tools that process TAP downstream to treat numbered text differently. Subtap does this to ignore line numbers when comparing text1 and text2 text.
 *
 * @param The instance of the tap module to which to add the assertions.
 */

Crumpler.addAsserts = function (tap) {
    tap.Test.prototype.addAssert('textEqual', 3, textEqual);
    tap.Test.prototype.addAssert('textEquals', 3, textEqual);
    tap.Test.prototype.addAssert('textInequal', 3, textNotEqual);
    tap.Test.prototype.addAssert('textNotEqual', 3, textNotEqual);
};

/**
 * Shorten the text1 and text2 text strings to minimal representations that clearly show differences between them. Returns a collapsed text1 value and a collapsed text2 value that themselves can be compared using a diffing tool to properly highlight their differences. The method reduces both the number of lines and the lengths of individual lines, according to the configuration. It also numbers the lines in accordance with the configuration.
 *
 * If line numbers are being added to the shortened text, and if the line numbers of the text1 and text2 values disagre on any lines, a diffing tool that subsequently compares the values will have to be smart enough to ignore the line numbers, unless they are removed prior to diffing.
 *
 * @param text1 The text1 text string.
 * @param text2 The text2 text string.
 * @param maxLineLength Maxinum characters allowed in a line, including added line numbers. 0 allows lines to be of unlimited length. Defaults to the value set for the Crumpler instance.
 * @param sameLength When a line of the text1 value differs from a line of the text2 value, and when maxLineLength is non-zero, the two corresponding lines can be collapsed analogously to ensure that at least the first different character is shown within the collapsed line. When sameLength is -1, this first character is approximately centered within the collapsed line. When sameLength >= 1 and the end of the line is being truncated, at most sameLength characters are presented prior to the first differing character. Defaults to the value set for the Crumpler instance.
 * @returns An object {text1, text2} containing the collapsed text1 text and the collapsed text2 text, shortened to optimize comparing their differences.
 */

Crumpler.prototype.shortenDiff = function (
        text1, text2, maxLineLength, sameLength)
{
    if (typeof text2 !== 'string')
        throw new Error("text2 value must be a string");
    if (_.isUndefined(maxLineLength))
        maxLineLength = this.opts.maxLineLength;
    if (_.isUndefined(sameLength))
        sameLength = this.opts.sameLength;
        
    // TBD: take advantage of Extent being stateless
        
    // If there are no diffs, short-circuit returning identically
    // shortened values.
    
    if (text1 === text2) {
        text2 = this._shorten(text2, maxLineLength, false);
        return { text1: text2, text2: text2 };
    }
    
    // Just shorten the text2 value if the text1 value isn't a string
    
    if (typeof text1 !== 'string') {
        text2 = this._shorten(text2, maxLineLength, false);
        return { text1: text1, text2: text2 };
    }
    
    // Generate the differences between the text1 and text2 values, with
    // the resulting deltas show how to turn text2 into text1.
    
    var deltas = diff.diffLines(text2, text1);

    // Determine whether we're numbering lines and determine the line
    // number padding, without wasting resources splitting on "\n",
    // because these strings are potentially large.
    
    var text1LineCount = 0;
    var text2LineCount = 0;
    deltas.forEach(function (delta) {
        if (delta.removed)
            text2LineCount += delta.count;
        else if (delta.added)
            text1LineCount += delta.count;
        else {
            text2LineCount += delta.count;
            text1LineCount += delta.count;
        }
    });
    
    var minNumberedLines = this.opts.minNumberedLines;
    var numberingLines = (minNumberedLines > 0 &&
            (minNumberedLines === 1
                || text1LineCount >= minNumberedLines
                || text2LineCount >= minNumberedLines)
        );
    var padWidth = Extent.digitCount(text1LineCount > text2LineCount ?
                        text1LineCount : text2LineCount);
    
    // Separately collapse each delta produced by the diffing tool,
    // accumulating the collapsed lines in text1Lines and text2Lines.
    
    var text1Lines = []; // text1 lines collected from deltas
    var text2Lines = []; // text2 lines collected from deltas
    var text1LineNumber = 1;
    var text2LineNumber = 1;
    var lineDiffOffset = 0; // offset to first diff in adjacent text1/text2
    var delta, deltaLines, extent, deltaLinesCopy;
    
    for (var i = 0; i < deltas.length; ++i) {
        delta = deltas[i];
        deltaLines = toLinesWithOptionalLF(delta.value);
        
        // handle a sequence of lines removed from the text2 value
        
        if (delta.removed) {
            lineDiffOffset = 0;
            if (i + 1 < deltas.length && deltas[i + 1].added) {
                // offset guaranteed to be within the first line of value
                lineDiffOffset =
                        firstDiffIndex(delta.value, deltas[i + 1].value);
            }
            extent = new Extent(
                    this.opts, this.config, maxLineLength, sameLength,
                    this.opts.collapsedModelEllipsis, numberingLines, padWidth
                );
            extent.shorten(deltaLines, text2LineNumber, lineDiffOffset);
            deltaLines.forEach(function (line) {
                text2Lines.push(line); // Array::concat() seems wasteful
            });
            text2LineNumber += delta.count;
        }
        
        // handle a sequence of lines added to the text1 value
        
        else if (delta.added) {
            extent = new Extent(
                    this.opts, this.config, maxLineLength, sameLength,
                    this.opts.collapsedSubjectEllipsis, numberingLines, padWidth
                );
            extent.shorten(deltaLines, text1LineNumber, lineDiffOffset);
            deltaLines.forEach(function (line) {
                text1Lines.push(line); // Array::concat() seems wasteful
            });
            text1LineNumber += delta.count;
        }
        
        // handle a sequence of lines common to both text1 and text2
        
        else {
            extent = new Extent(
                    this.opts, this.config, maxLineLength, sameLength,
                    this.opts.collapsedSameEllipsis, numberingLines, padWidth
                );
            if (text1LineNumber === text2LineNumber) {
                extent.shorten(deltaLines, text1LineNumber, 0);
                deltaLines.forEach(function (line) {
                    text2Lines.push(line); // Array::concat() seems wasteful
                    text1Lines.push(line);
                });
            }
            else {
                deltaLinesCopy = deltaLines.slice(0);
                extent.shorten(deltaLines, text2LineNumber, 0);
                deltaLines.forEach(function (line) {
                    text2Lines.push(line); // Array::concat() seems wasteful
                });
                extent.shorten(deltaLinesCopy, text1LineNumber, 0);
                deltaLinesCopy.forEach(function (line) {
                    text1Lines.push(line);
                });
            }
            text2LineNumber += delta.count;
            text1LineNumber += delta.count;
        }
    }
    
    // Construct the collapsed text1 and text2 values, mimicking any
    // trailing LF of the corresponding originally-provided value.
    
    return {
        text1: toTextWithOptionalLF(text1Lines, text1),
        text2: toTextWithOptionalLF(text2Lines, text2)
    };
};

/**
 * Shorten the individual lines of the text without removing any lines. Lines longer than the maximum length are collapsed at the ends as configured. Also number the lines according to the configuration.
 *
 * @param text String containing one or more lines to shorten. LFs ("\n") are assumed to delimit lines, so a trailing LF indicates a blank line.
 * @param maxLineLength Maxinum characters allowed in a line, including added line numbers. 0 allows lines to be of unlimited length. Defaults to the value set for the Crumpler instance.
 * @returns a String of the text with lines shortened as specified
 */

Crumpler.prototype.shortenLines = function (text, maxLineLength) {
    if (_.isUndefined(maxLineLength))
        maxLineLength = this.opts.maxLineLength;
    return this._shorten(text, maxLineLength, true);
};

/**
 * Shorten the entire text, both reducing the number of lines and the lengths of the individual lines, according to the configuration. Also number the lines according to the configuration. Collapses sequences of lines as well as the ends of lines that exceed the indicated maximum line length.
 *
 * @param text String of one or more lines of text to shorten.
 * @param maxLineLength Maxinum characters allowed in a line, including added line numbers. 0 allows lines to be of unlimited length. Defaults to the value set for the Crumpler instance.
 * @returns a String of the text shortened as specified
 */

Crumpler.prototype.shortenText = function (text, maxLineLength) {
    if (_.isUndefined(maxLineLength))
        maxLineLength = this.opts.maxLineLength;
    return this._shorten(text, maxLineLength, false);
};

//// PRIVATE METHODS //////////////////////////////////////////////////////////

Crumpler.prototype._isNumberingLines = function (lineCount) {
    if (this.opts.minNumberedLines === 0)
        return false;
    return (lineCount >= this.opts.minNumberedLines);
};

Crumpler.prototype._shorten = function (text, maxLineLength, linesOnly)
{
    var lines = toLinesWithOptionalLF(text);
    var extent = new Extent(
            this.opts, this.config, maxLineLength, 0,
            this.opts.collapsedSameEllipsis,
            this._isNumberingLines(lines.length),
            Extent.digitCount(lines.length)
        );
    if (linesOnly || this.opts.bracketSize === 0)
        extent.shortenLines(lines, 0, 1, lines.length, 0);
    else
        extent.shortenText(lines, 1, 0);
    return toTextWithOptionalLF(lines, text);
};

//// ASSERTIONS ///////////////////////////////////////////////////////////////

function textEqual(found, wanted, crumpler, message, extra) {
    crumpler = crumpler || new Crumpler();
    message = message || "text should be identical";
    var shrunk = crumpler.textDiff(found, wanted);
    // TBD: add lineNumbers to extra
    return this.equal(shrunk.text1, shrunk.text2, message, extra);
}

function textNotEqual(found, notWanted, crumpler, message, extra) {
    crumpler = crumpler || new Crumpler();
    message = message || "text should be different";
    var shrunk = crumpler.textDiff(found, notWanted);
    // TBD: add lineNumbers to extra
    return this.notEqual(shrunk.text1, shrunk.text2, message, extra);
}

//// SUPPORT FUNCTIONS ////////////////////////////////////////////////////////

function firstDiffIndex(text1, text2) {
    // assumes that there is a difference
    var baseLength = text1.length;
    if (baseLength > text2.length)
        baseLength = text2.length;
    var i = 0;
    while (i < baseLength && text1[i] === text2[i])
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