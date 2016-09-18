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
  
Crumpler is also able to number the lines in the abbreviated text with the line numbers of the original text. Empty strings are treated as having no lines.

Crumpler.addAsserts() extends an instance of 'tap' with test assertions for using Crumpler to compare two strings of text. When numbering lines, these assertions append a lineNumbers extra flag to inform downstream TAP consumers that line numbers are present. For example, this flag informs subtap to render differences between the texts other than differences in line numbers.

See Crumpler on github for an explanation of the configuration options:
https://github.com/jtlapp/crumpler

See the tap test harness at (http://www.node-tap.org/).
See the subtap test runner at (https://github.com/jtlapp/subtap).

The Crumpler class is stateless, so the methods of an instance can be used repeatedly or concurrently without concern for interference.
******************************************************************************/

/**
@classdesc This reference assumes the module is loaded in the variable `Crumpler`.
@class Crumpler
*/

//// CONFIGURATION ////////////////////////////////////////////////////////////

// opts - configuration options provided at construction
// config - configuration values derived from opts:
//   headInfo: precomputed information about headCropEllipsis
//   tailInfo: precomputed information about tailCropEllipsis
//   paddingByLength: array of padding strings indexed by padding length

//// CONSTRUCTION /////////////////////////////////////////////////////////////

/**
 * Create an instance of Crumpler, optionally configured.
 *
 * @constructor
 * @param options An object configured as described in the [configuration section](#configuration).
 */

function Crumpler(options) {
    if(!(this instanceof Crumpler)) // allow instantiation without "new"
        return new Crumpler(options);
    
    options = options || {};
    if (_.isUndefined(options.normBracketSize))
        options.normBracketSize = 2;
    if (_.isUndefined(options.diffBracketSize))
        options.diffBracketSize = 2;
    if (_.isUndefined(options.minCollapsedLines))
        options.minCollapsedLines = 2;
    else if (options.minCollapsedLines < 1)
        throw new Error("minCollapsedLines must be >= 1");
    if (_.isUndefined(options.maxNormLineLength))
        options.maxNormLineLength = 0;
    if (_.isUndefined(options.maxLineDiffLength))
        options.maxLineDiffLength = 0;
    if (_.isUndefined(options.sameHeadLengthLimit))
        options.sameHeadLengthLimit = -1;
    if (_.isUndefined(options.sameTailLengthLimit))
        options.sameTailLengthLimit = -1;
    if (_.isUndefined(options.normCollapseEllipsis))
        options.normCollapseEllipsis = DEFAULT_NORM_COLLAPSE_ELLIPSIS;
    if (_.isUndefined(options.subjectCollapseEllipsis))
        options.subjectCollapseEllipsis = DEFAULT_SUBJECT_COLLAPSE_ELLIPSIS;
    if (_.isUndefined(options.modelCollapseEllipsis))
        options.modelCollapseEllipsis = DEFAULT_MODEL_COLLAPSE_ELLIPSIS;
    if (_.isUndefined(options.headCropEllipsis))
        options.headCropEllipsis = DEFAULT_HEAD_CROP_ELLIPSIS;
    if (_.isUndefined(options.tailCropEllipsis))
        options.tailCropEllipsis = DEFAULT_TAIL_CROP_ELLIPSIS;
    if (_.isUndefined(options.indentCollapseEllipses))
        options.indentCollapseEllipses = false;
    if (_.isUndefined(options.minNumberedLines))
        options.minNumberedLines = 2;
    if (_.isUndefined(options.lineNumberPadding))
        options.lineNumberPadding = null;
    else if (options.lineNumberPadding === '')
        options.lineNumberPadding = null;
    if (options.lineNumberDelim === null)
        options.lineNumberDelim = '';
    else if (_.isUndefined(options.lineNumberDelim))
        options.lineNumberDelim = ':';
        
    var config = {};
    config.headInfo = Extent.getCropInfo(options.headCropEllipsis);
    config.tailInfo = Extent.getCropInfo(options.tailCropEllipsis);
        
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
 * Shorten the subject and model text strings to minimal representations that clearly show differences between them. Returns an abbreviated subject string and an abbreviated model string that themselves can be compared using a diffing tool to properly highlight their differences. The method reduces both the number of lines and the lengths of individual lines, according to the configuration. It also numbers the lines in accordance with the configuration.
 *
 * If line numbers are being added to the shortened text, and if the line numbers of the subject and model values disagree on any lines, a diffing tool that subsequently compares the values will have to be smart enough to ignore the line numbers, unless the line numbers are removed prior to diffing. This method also returns the line number delimiter it used, if any, for use by the downstream diffing tool to properly handle line numbers.
 *
 * @param subject The subject text string.
 * @param model The model text string.
 * @returns An object having properties `subject`, `model`, and `lineNumberDelim`. The first two properties are the abbreviated subject and model texts, shortened to optimize comparing their differences. `lineNumberDelim` is either null to indicate that subject and model lines were not numbered or a string providing the delimiter used between each line number and the rest of the line. Collapsed ellipsis lines are not numbered. Subject or model text that is an empty string has no lines and no line numbers.
 */

Crumpler.prototype.shortenDiff = function (subject, model)
{
    if (typeof model !== 'string')
        throw new Error("model value must be a string");
        
    // If there are no diffs, short-circuit all the work by returning
    // identically shortened values.
    
    if (subject === model) {
        var shrunk = this._shorten(model, this.opts.maxNormLineLength,
                this.opts.normBracketSize);
        shrunk.model = shrunk.subject;
        return shrunk;
    }
    
    // Just shorten the model value if the subject value isn't a string
    
    if (typeof subject !== 'string') {
        var shrunk = this._shorten(model, this.opts.maxNormLineLength,
                this.opts.normBracketSize);
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
        this.opts, this.config, this.opts.maxNormLineLength,
        this.opts.normBracketSize, this.opts.normCollapseEllipsis,
        numberingLines, padWidth
    );
    var subjectExtent = new Extent(
        this.opts, this.config, this.opts.maxLineDiffLength,
        this.opts.diffBracketSize, this.opts.subjectCollapseEllipsis,
        numberingLines, padWidth
    );
    var modelExtent = new Extent(
        this.opts, this.config, this.opts.maxLineDiffLength,
        this.opts.diffBracketSize, this.opts.modelCollapseEllipsis,
        numberingLines, padWidth
    );
    
    // Separately collapse each delta produced by the diffing tool,
    // accumulating the collapsed lines in subjectLines and modelLines.
    
    var subjectLines = []; // subject lines collected from deltas
    var modelLines = []; // model lines collected from deltas
    var subjectLineNumber = 1;
    var modelLineNumber = 1;
    var diffInfo = null; // offset and lengths of diffs between lines
    var delta, deltaLines, extent, deltaLinesCopy, diffInfo;
    
    for (var i = 0; i < deltas.length; ++i) {
        delta = deltas[i];
        deltaLines = toLinesWithOptionalLF(delta.value);
        
        // handle a sequence of lines removed from the model value
        
        if (delta.removed) {
            diffInfo = null; // resume assumption of no differences
            if (i + 1 < deltas.length && deltas[i + 1].added) {
                // offset guaranteed to be within the first line of value
                diffInfo = getDiffInfo(
                        deltas[i + 1].value.match(/[^\n]*/)[0], deltaLines[0]);
            }
            modelExtent.shorten(deltaLines, modelLineNumber,
                    (diffInfo ? diffInfo.diffIndex : 0),
                    (diffInfo ? diffInfo.modelDiffLength : 0));
            deltaLines.forEach(function (line) {
                modelLines.push(line); // Array::concat() seems wasteful here
            });
            modelLineNumber += delta.count;
        }
        
        // handle a sequence of lines added to the subject value
        
        else if (delta.added) {
            subjectExtent.shorten(deltaLines, subjectLineNumber,
                    (diffInfo ? diffInfo.diffIndex : 0),
                    (diffInfo ? diffInfo.subjectDiffLength : 0));
            deltaLines.forEach(function (line) {
                subjectLines.push(line);
            });
            subjectLineNumber += delta.count;
        }
        
        // handle a sequence of lines common to both subject and model
        
        else {
            if (subjectLineNumber === modelLineNumber) {
                normExtent.shorten(deltaLines, subjectLineNumber, -1);
                deltaLines.forEach(function (line) {
                    modelLines.push(line);
                    subjectLines.push(line);
                });
            }
            else {
                deltaLinesCopy = deltaLines.slice(0);
                normExtent.shorten(deltaLines, modelLineNumber, -1);
                deltaLines.forEach(function (line) {
                    modelLines.push(line);
                });
                normExtent.shorten(deltaLinesCopy, subjectLineNumber, -1);
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
        lineNumberDelim: (numberingLines ? this.opts.lineNumberDelim : null)
    };
};

/**
 * Shorten the provided text in accordance with the configuration. Because the text is not being compared with another text, it shortens as if it were a section of text common to two compared texts.
 *
 * @param text String of one or more lines of text to shorten.
 * @param maxLineLength Maximum characters of a line to include. 0 allows lines of unlimited length. Defaults to the maxNormLineLength option.
 * @returns a String of the text shortened as specified
 */

Crumpler.prototype.shortenText = function (text, maxLineLength) {
    if (_.isUndefined(maxLineLength))
        maxLineLength = this.opts.maxNormLineLength;
    return this._shorten(text, maxLineLength,
            this.opts.normBracketSize).subject;
};

//// PRIVATE METHODS //////////////////////////////////////////////////////////

Crumpler.prototype._isNumberingLines = function (lineCount) {
    if (this.opts.minNumberedLines === 0)
        return false;
    return (lineCount >= this.opts.minNumberedLines);
};

Crumpler.prototype._shorten = function (text, maxLineLength, bracketSize)
{
    var lines = toLinesWithOptionalLF(text);
    var numberingLines = this._isNumberingLines(lines.length);
    var extent = new Extent(
            this.opts, this.config, maxLineLength,
            bracketSize, this.opts.normCollapseEllipsis,
            numberingLines, Extent.digitCount(lines.length)
        );
    extent.shorten(lines, 1, -1);
    return {
        subject: toTextWithOptionalLF(lines, text),
        lineNumberDelim: (numberingLines ? this.opts.lineNumberDelim : null)
    };
};

//// CLASS METHODS ////////////////////////////////////////////////////////////

/**
 * Adds test assertion methods to an instance of tap. These assertions call shortenDiff() on their found and wanted values using a provided instance of Crumpler. Each of these assertion methods takes parameters in the form textEqual(found, wanted, crumpler, description, extra). Only the first two parameters are required. The default crumpler is `new Crumpler()`.
 *
 * When lines are being numbered, these assertion methods attache a `{lineNumbers: true}` option to the tap extra field, which allows tools that process TAP downstream to treat numbered text differently. Subtap does this to ignore line numbers when comparing subject and model text.
 *
 * @param The instance of the tap module to which to add the assertions.
 */

Crumpler.addAsserts = function (tap) {
    // I opted for 'textEqual' forms instead of 'equalText' forms to help
    // prevent people from typing invalid forms such as 'equalStrict'.
    tap.Test.prototype.addAssert('textEqual', 3, textEqual);
    tap.Test.prototype.addAssert('textEquals', 3, textEqual);
    tap.Test.prototype.addAssert('textInequal', 3, textNotEqual);
    tap.Test.prototype.addAssert('textNotEqual', 3, textNotEqual);
};

//// ASSERTIONS ///////////////////////////////////////////////////////////////

// spare assertions from repeatedly creating the same stateless object
var DEFAULT_CRUMPLER = new Crumpler();

function textEqual(found, wanted, crumpler, message, extra) {
    if (typeof crumpler === 'string') {
        extra = message;
        message = crumpler;
        crumpler = null;
    }
    crumpler = crumpler || DEFAULT_CRUMPLER;
    message = message || "text should be identical";
    extra = extra || {};
    var shrunk = crumpler.shortenDiff(found, wanted);
    if (shrunk.lineNumberDelim !== null)
        extra.lineNumberDelim = shrunk.lineNumberDelim;
    return this.equal(shrunk.subject, shrunk.model, message, extra);
}

function textNotEqual(found, notWanted, crumpler, message, extra) {
    if (typeof crumpler === 'string') {
        extra = message;
        message = crumpler;
        crumpler = null;
    }
    crumpler = crumpler || DEFAULT_CRUMPLER;
    message = message || "text should be different";
    extra = extra || {};
    var shrunk = crumpler.shortenDiff(found, notWanted);
    if (shrunk.lineNumberDelim !== null)
        extra.lineNumberDelim = shrunk.lineNumberDelim;
    return this.notEqual(shrunk.subject, shrunk.model, message, extra);
}

//// SUPPORT FUNCTIONS ////////////////////////////////////////////////////////

function getDiffInfo(subjectLine, modelLine) {
    // assumes that there is a difference
    
    var baseLength = subjectLine.length;
    if (baseLength > modelLine.length)
        baseLength = modelLine.length;
    var diffIndex = 0;
    while (diffIndex < baseLength &&
            subjectLine[diffIndex] === modelLine[diffIndex])
        ++diffIndex;

    var subjectIndex = subjectLine.length;
    var modelIndex = modelLine.length;    
    while (subjectIndex > diffIndex && modelIndex > diffIndex &&
            subjectLine[--subjectIndex] === modelLine[--modelIndex])
        ;
    if (subjectIndex > diffIndex && modelIndex > diffIndex) {
        ++subjectIndex;
        ++modelIndex;
    }
        
    return {
        diffIndex: diffIndex,
        subjectDiffLength: subjectIndex - diffIndex,
        modelDiffLength: modelIndex - diffIndex
    };
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
