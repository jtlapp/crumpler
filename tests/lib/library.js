/******************************************************************************
Library of tools for crumpler tests
******************************************************************************/

var fs = require('fs');
var path = require('path');
var _ = require('lodash');

exports.headEllipsis = function (count) {
    // default line-end collapse
    return "["+ count +" chars...]";
};

exports.loadFixture = function (filename) {
    var filePath = path.resolve(__dirname, '../fixtures/'+ filename);
    return fs.readFileSync(filePath, 'utf8');
};

exports.normEllipsis = function () {
    // default multiline "same" collapse
    return " ...";
};

exports.subjectEllipsis = function () {
    // default multiline "found" collapse
    return "   ...";
};

exports.modelEllipsis = function () {
    // default multiline "wanted" collapse
    return "  ...";
};

exports.numberLines = function (text, padChar, delim) {
    if (_.isUndefined(padChar))
        padChar = '';
    if (_.isUndefined(delim))
        delim = ':';
    var lines = text.split("\n");
    if (lines.length > 1 && lines[lines.length - 1] === '')
        lines.pop();
    var padWidth = lines.length.toString().length;
    for (var i = 0; i < lines.length; ++i) {
        var prefix;
        if (padChar !== null && padChar !== '')
            prefix = _.padStart(String(i + 1), padWidth, padChar);
        else
            prefix = String(i + 1) + delim;
        lines[i] = prefix + lines[i];
    }
    var newText = lines.join("\n");
    if (text[text.length - 1] === "\n")
        newText += "\n";
    return newText;
};

exports.stripNumbering = function (text) {
    var lines = text.split("\n");
    var line, matches;
    for (var i = 0; i < lines.length; ++i) {
        line = lines[i];
        matches = line.match(/^ *[0-9]+/);
        if (matches !== null) {
            if (line.length == matches[0].length)
                line = '';
            else
                line = line.substr(matches[0].length + 1);
        }
        lines[i] = line;
    }
    return lines.join("\n");
};

exports.subst = function (str, offset, newChar) {
    return str.substr(0, offset) + newChar + str.substr(offset + 1);
};

exports.subsetLines = function (text, lineCount) {
    var regex = new RegExp("([^\n]*\n){"+ lineCount +"}");
    var matches = text.match(regex);
    return matches[0];
};

exports.tailEllipsis = function (count) {
    // default line-end collapse
    return "[..."+ count +" chars]";
};

exports.testDiffs = function (t, testName, foundPair, wantedPair) {
    exports.normalizeResults(foundPair);
    exports.normalizeResults(wantedPair);
    t.test(testName, function (t) {
        t.equal(foundPair.subject, wantedPair.subject,
            "collapsed subject");
        t.equal(foundPair.model, wantedPair.model,
            "collapsed model");
        t.equal(foundPair.sectionTitlePrefix, wantedPair.sectionTitlePrefix,
            "sectionTitlePrefix");
        t.equal(foundPair.lineNumberDelim, wantedPair.lineNumberDelim,
            "lineNumberDelim");
        t.end();
    });
};

exports.normalizeResults = function (resultPair) {
    if (_.isUndefined(resultPair.lineNumberDelim))
        resultPair.lineNumberDelim = null;
    if (_.isUndefined(resultPair.sectionTitlePrefix))
        resultPair.sectionTitlePrefix = null;
};