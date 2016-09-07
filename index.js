/******************************************************************************
Tool for making lengthy text suitable for line-by-line visual comparison, particularly for use in the tap test harness and the subtap test runner.
******************************************************************************/

//// MODULES //////////////////////////////////////////////////////////////////

var diff = require('diff');
var _ = require('lodash');
var Extent = require('./lib/Extent');

//// CONSTANTS ////////////////////////////////////////////////////////////////

var DEFAULT_NORM_COLLAPSE_ELLIPSIS    = " ...";
var DEFAULT_MODEL_COLLAPSE_ELLIPSIS   = "  ...";
var DEFAULT_SUBJECT_COLLAPSE_ELLIPSIS = "   ...";
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

----

The Crumpler constructor takes an object of configuration options. The following options govern collapsing sequences of lines:

- normBracketSize: Number of lines to show on each side of a collapsed sequence of lines that does not differ from a comparison text. This is the number of lines in a bracket of text that is common to a comparison text or that is not being compared to another text. Set to 0 to turn off collapsing in these cases. The shortenLines() method ignores this options because it does not collapse text. (default 2)

- diffBracketSize: Number of lines to show on each side of a collapsed sequence of lines that differs from a comparison text. Set to 0 to disable the collapsing of text that differs from the comparison text. (default 0)

- minCollapsedLines: Minimum number of lines that can be removed from a sequence of lines to collapse it. In order for text to collapse it must have at least this number of lines plus twice the applicable bracket size. Must be > 0. (default 2)

The following options govern line cropping:

- maxNormLineLength: The maximum number of characters to show from each line of a sequence of lines that does not differ from a comparison text. This the maximum length of a line that is common to a comparison text or that is not being compared to another text. Set to 0 to show the entire line in these cases. Methods that have a maxLineLength parameter employ maxLineLength in place of the configured maxNormLineLength. (default 0)

- maxDiffLineLength: The maximum number of characters to show from each line of a sequence of lines that differs from a comparison text. Must be greater than sameHeadLengthLimit to be sure that at least some differing characters show. Set to 0 to show differing lines in their entirety. (default 0)

- sameHeadLengthLimit: The limited number of characters of a line to show before the first character of the line that differs from a comparison text. These characters are common to a line in both subject and model texts and provide preceding context for the characters that differ. Prior characters are cropped and replaced with headCropEllipsis, but only if the crop would exceed the length of the replacement. If maxDiffLineLength is non-zero and the remainder of the line fits in fewer characters, additional preceding characters are shown until either the entire line is shown or maxDiffLineLength characters are shown. Set to 0 to never show preceeding characters. Set to -1 to always show all preceding characters. Must be less than maxDiffLineLength. (default -1)

- sameTailLengthLimit: The limited number of characters of a line to show after the last character of the line that differs from a comparison text. These characters are common to a line in both subject and model texts and provide following context for the characters that differ. Subsequent characters are cropped and replaced with tailCropEllipsis, but only if the crop would exceed the length of the replacement. A non-zero maxDiffLineLength may shorten the number of following characters shown or even prevent following characters from being shown. Set to 0 to never show following characters. Set to -1 to always show all following characters. (default -1)

The following options provide replacement text for text that is removed by collapsing or cropping. Their values may optionally contain "{n}". Within the collapse ellipses, "{n}" is a placeholder for the number of lines removed. Within the crop ellipses, "{n}" is a placeholder for the number of characters removed. By making minCollapsedLines >= 2, the collapse ellipses language can assume a plurality. Because crops never replace fewer characters than their lengths, the crop ellipses language can assume a plurality by ensuring that headCropEllipsis and tailCropEllipsis always contain at least two characters.

- normCollapseEllipsis: One or more lines that replace lines removed in the collapse of text that does not differ from a comparison text. This is the ellipsis for collapsed text that is common to a comparison text or that is not being compared to another text. (default " ...")

- subjectCollapseEllipsis: One or more lines that replace lines removed in the collapse of subject text not found in the model text. (default "   ...")

- modelCollapseEllipsis: One or more lines that replace lines removed in the collapse of model text not found in the subject text. (default "  ...")

- headCropEllipsis: String that replaces characters cropped from the head (start) of a line. (default "[{n} chars...]")

- tailCropEllipsis: String that replaces characters cropped from the tail (end) of a line. (default "[...{n} chars]")

- indentCollapseEllipses: When true and lines are being numbered, each line of a collapse ellipsis is indented by a number of spaces equal to the offset endured by the immediately prior line due to line numbering. The immediately prior line is the last line of the preceding bracket. The indentation includes the padded width of the line number and the length of lineNumberDelim. (default false)

Any of these ellipses may be blank, but only collapse ellipses may contain LFs ("\n"). A blank collapse ellipsis produces a blank line, while a blank crop ellipsis abruptly truncates the line. A trailing LF of a collapse ellipsis produces a trailing blank line.
  
The collapse ellipses need not all be different, but they should all be different. Making them distinct from one another helps downstream tools that diff the collapsed strings to properly recognize differences. These tools may otherwise assume that collapse ellipses all represent identical lines.

The following options govern line numbering. Line numbering is useful both for mapping lines in abbreviated text to the original text and for readily observing the lengths of collapsed text.

- minNumberedLines: Minimum number of lines that a text must have in order for line numbers to be added to the abbreviated text. 0 disables line numbering. When comparing subject and model texts, the lines of both abbreviated texts are numbered if either text exceeds this minimum line count. (default 2)

- lineNumberPadding: The character to use for left-padding line numbers to make them all occupy the same character width. When comparing subject and model texts, line numbers are padded to the greater of their width requirements. Set to null or '' to disable left-padding. (default null)

- lineNumberDelim: Delimeter that follows each line number. May be null or '' to insert no delimeter. (default ":")

The Crumpler class is stateless, so the methods of an instance can be used repeatedly or concurrently without concern for interference.
******************************************************************************/

//// CONFIGURATION ////////////////////////////////////////////////////////////

// opts - configuration options provided at construction
// config - configuration values derived from opts:
//   headInfo: precomputed information about headCropEllipsis
//   tailInfo: precomputed information about tailCropEllipsis
//   paddingByLength: array of padding strings indexed by padding length

//// CONSTRUCTION /////////////////////////////////////////////////////////////

function Crumpler(options) {
    if(!(this instanceof Crumpler)) // allow instantiation without "new"
        return new Crumpler(options);
    
    options = options || {};
    if (!_.isInteger(options.bracketSize))
        options.bracketSize = 2;
    if (!_.isInteger(options.minCollapsedLines))
        options.minCollapsedLines = 2;
    else if (options.minCollapsedLines < 1)
        options.minCollapsedLines = 1;
    if (!_.isInteger(options.maxLineLength))
        options.maxLineLength = 0;
    if (!_.isInteger(options.sameLength))
        options.sameLength = -1;
    if (!_.isString(options.normCollapseEllipsis))
        options.normCollapseEllipsis = DEFAULT_NORM_COLLAPSE_ELLIPSIS;
    if (!_.isString(options.subjectCollapseEllipsis))
        options.subjectCollapseEllipsis = DEFAULT_SUBJECT_COLLAPSE_ELLIPSIS;
    if (!_.isString(options.modelCollapseEllipsis))
        options.modelCollapseEllipsis = DEFAULT_MODEL_COLLAPSE_ELLIPSIS;
    if (!_.isString(options.headCropEllipsis))
        options.headCropEllipsis = DEFAULT_HEAD_CROP_ELLIPSIS;
    if (!_.isString(options.tailCropEllipsis))
        options.tailCropEllipsis = DEFAULT_TAIL_CROP_ELLIPSIS;
    if (!_.isBoolean(options.indentCollapseEllipses))
        options.indentCollapseEllipses = false;
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
    config.headInfo = Extent.getCollapseInfo(options.headCropEllipsis);
    config.tailInfo = Extent.getCollapseInfo(options.tailCropEllipsis);
        
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
 * Shorten the subject and model text strings to minimal representations that clearly show differences between them. Returns a collapsed subject value and a collapsed model value that themselves can be compared using a diffing tool to properly highlight their differences. The method reduces both the number of lines and the lengths of individual lines, according to the configuration. It also numbers the lines in accordance with the configuration.
 *
 * If line numbers are being added to the shortened text, and if the line numbers of the subject and model values disagre on any lines, a diffing tool that subsequently compares the values will have to be smart enough to ignore the line numbers, unless they are removed prior to diffing.
 *
 * @param subject The subject text string.
 * @param model The model text string.
 * @param maxLineLength Maxinum characters allowed in a line, including added line numbers. 0 allows lines to be of unlimited length. Defaults to the value set for the Crumpler instance.
 * @param sameLength When a line of the subject value differs from a line of the model value, and when maxLineLength is non-zero, the two corresponding lines can be collapsed analogously to ensure that at least the first different character is shown within the collapsed line. When sameLength is -1, this first character is approximately centered within the collapsed line. When sameLength >= 1 and the end of the line is being truncated, at most sameLength characters are presented prior to the first differing character. Defaults to the value set for the Crumpler instance.
 * @returns An object {subject, model, numbered} containing the abbreviated subject and model texts, shortened to optimize comparing their differences. It also contains a boolean indicating whether the subject and model texts were numbered.
 */

Crumpler.prototype.shortenDiff = function (
        subject, model, maxLineLength, sameLength)
{
    if (typeof model !== 'string')
        throw new Error("model value must be a string");
    if (_.isUndefined(maxLineLength))
        maxLineLength = this.opts.maxLineLength;
    if (_.isUndefined(sameLength))
        sameLength = this.opts.sameLength;
        
    // TBD: take advantage of Extent being stateless
        
    // If there are no diffs, short-circuit returning identically
    // shortened values.
    
    if (subject === model) {
        var shrunk = this._shorten(model, maxLineLength, false);
        shrunk.model = shrunk.subject;
        return shrunk;
    }
    
    // Just shorten the model value if the subject value isn't a string
    
    if (typeof subject !== 'string') {
        var shrunk = this._shorten(model, maxLineLength, false);
        shrunk.model = shrunk.subject;
        shrunk.subject = subject;
        return shrunk;
    }
    
    // Generate the differences between the subject and model values, with
    // the resulting deltas show how to turn model into subject.
    
    var deltas = diff.diffLines(model, subject);

    // Determine whether we're numbering lines and determine the line
    // number padding, without wasting resources splitting on "\n",
    // because these strings are potentially large.
    
    var subjectLineCount = 0;
    var modelLineCount = 0;
    deltas.forEach(function (delta) {
        if (delta.removed)
            modelLineCount += delta.count;
        else if (delta.added)
            subjectLineCount += delta.count;
        else {
            modelLineCount += delta.count;
            subjectLineCount += delta.count;
        }
    });
    
    var minNumberedLines = this.opts.minNumberedLines;
    var numberingLines = (minNumberedLines > 0 &&
            (minNumberedLines === 1
                || subjectLineCount >= minNumberedLines
                || modelLineCount >= minNumberedLines)
        );
    var padWidth = Extent.digitCount(subjectLineCount > modelLineCount ?
                        subjectLineCount : modelLineCount);
                        
    // Create the extents needed for this run. They are stateless.
    
    var normExtent = new Extent(
        this.opts, this.config, maxLineLength, sameLength,
        this.opts.normCollapseEllipsis, numberingLines, padWidth
    );
    var subjectExtent = new Extent(
        this.opts, this.config, maxLineLength, sameLength,
        this.opts.subjectCollapseEllipsis, numberingLines, padWidth
    );
    var modelExtent = new Extent(
        this.opts, this.config, maxLineLength, sameLength,
        this.opts.modelCollapseEllipsis, numberingLines, padWidth
    );
    
    // Separately collapse each delta produced by the diffing tool,
    // accumulating the collapsed lines in subjectLines and modelLines.
    
    var subjectLines = []; // subject lines collected from deltas
    var modelLines = []; // model lines collected from deltas
    var subjectLineNumber = 1;
    var modelLineNumber = 1;
    var lineDiffOffset = 0; // offset to first diff in adjacent subject/model
    var delta, deltaLines, extent, deltaLinesCopy;
    
    for (var i = 0; i < deltas.length; ++i) {
        delta = deltas[i];
        deltaLines = toLinesWithOptionalLF(delta.value);
        
        // handle a sequence of lines removed from the model value
        
        if (delta.removed) {
            lineDiffOffset = 0;
            if (i + 1 < deltas.length && deltas[i + 1].added) {
                // offset guaranteed to be within the first line of value
                lineDiffOffset =
                        firstDiffIndex(delta.value, deltas[i + 1].value);
            }
            modelExtent.shorten(deltaLines, modelLineNumber, lineDiffOffset);
            deltaLines.forEach(function (line) {
                modelLines.push(line); // Array::concat() seems wasteful
            });
            modelLineNumber += delta.count;
        }
        
        // handle a sequence of lines added to the subject value
        
        else if (delta.added) {
            subjectExtent.shorten(deltaLines, subjectLineNumber,
                    lineDiffOffset);
            deltaLines.forEach(function (line) {
                subjectLines.push(line); // Array::concat() seems wasteful
            });
            subjectLineNumber += delta.count;
        }
        
        // handle a sequence of lines common to both subject and model
        
        else {
            if (subjectLineNumber === modelLineNumber) {
                normExtent.shorten(deltaLines, subjectLineNumber, 0);
                deltaLines.forEach(function (line) {
                    modelLines.push(line); // Array::concat() seems wasteful
                    subjectLines.push(line);
                });
            }
            else {
                deltaLinesCopy = deltaLines.slice(0);
                normExtent.shorten(deltaLines, modelLineNumber, 0);
                deltaLines.forEach(function (line) {
                    modelLines.push(line); // Array::concat() seems wasteful
                });
                normExtent.shorten(deltaLinesCopy, subjectLineNumber, 0);
                deltaLinesCopy.forEach(function (line) {
                    subjectLines.push(line);
                });
            }
            modelLineNumber += delta.count;
            subjectLineNumber += delta.count;
        }
    }
    
    // Construct the collapsed subject and model values, mimicking any
    // trailing LF of the corresponding originally-provided value.
    
    return {
        subject: toTextWithOptionalLF(subjectLines, subject),
        model: toTextWithOptionalLF(modelLines, model),
        numbered: numberingLines
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
    return this._shorten(text, maxLineLength, true).subject;
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
    return this._shorten(text, maxLineLength, false).subject;
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
    var numberingLines = this._isNumberingLines(lines.length);
    var extent = new Extent(
            this.opts, this.config, maxLineLength, 0,
            this.opts.normCollapseEllipsis,
            numberingLines,
            Extent.digitCount(lines.length)
        );
    if (linesOnly || this.opts.bracketSize === 0)
        extent.shortenLines(lines, 0, 1, lines.length, 0);
    else
        extent.shortenText(lines, 1, 0);
    return {
        subject: toTextWithOptionalLF(lines, text),
        numbered: numberingLines
    };
};

//// CLASS METHODS ////////////////////////////////////////////////////////////

/**
 * Adds assertions to an instance of tap that call shortenDiff() on subject and model values for a provided instance of Crumpler. When lines are being numbered, attaches a { lineNumbers: true } option to the tap extra field, which allows tools that process TAP downstream to treat numbered text differently. Subtap does this to ignore line numbers when comparing subject and model text.
 *
 * @param The instance of the tap module to which to add the assertions.
 */

Crumpler.addAsserts = function (tap) {
    tap.Test.prototype.addAssert('textEqual', 3, textEqual);
    tap.Test.prototype.addAssert('textEquals', 3, textEqual);
    tap.Test.prototype.addAssert('textInequal', 3, textNotEqual);
    tap.Test.prototype.addAssert('textNotEqual', 3, textNotEqual);
};

//// ASSERTIONS ///////////////////////////////////////////////////////////////

// spare assertions from repeatedly creating the same stateless object
var DEFAULT_CRUMPLER = new Crumpler();

function textEqual(found, wanted, crumpler, message, extra) {
    crumpler = crumpler || DEFAULT_CRUMPLER;
    message = message || "text should be identical";
    extra = extra || {};
    var shrunk = crumpler.textDiff(found, wanted);
    if (shrunk.numbered)
        extra.lineNumbers = true;
    return this.equal(shrunk.subject, shrunk.model, message, extra);
}

function textNotEqual(found, notWanted, crumpler, message, extra) {
    crumpler = crumpler || DEFAULT_CRUMPLER;
    message = message || "text should be different";
    extra = extra || {};
    var shrunk = crumpler.textDiff(found, notWanted);
    if (shrunk.numbered)
        extra.lineNumbers = true;
    return this.notEqual(shrunk.subject, shrunk.model, message, extra);
}

//// SUPPORT FUNCTIONS ////////////////////////////////////////////////////////

function firstDiffIndex(subject, model) {
    // assumes that there is a difference
    var baseLength = subject.length;
    if (baseLength > model.length)
        baseLength = model.length;
    var i = 0;
    while (i < baseLength && subject[i] === model[i])
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
