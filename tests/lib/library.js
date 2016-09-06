/******************************************************************************
Library of tools for crumpler tests
******************************************************************************/

var fs = require('fs');
var path = require('path');
var _ = require('lodash');

exports.endLine = function (count) {
    // default line-end collapse
    return "[..."+ count +" chars]";
};

exports.loadFixture = function (filename) {
    var filePath = path.resolve(__dirname, '../fixtures/'+ filename);
    return fs.readFileSync(filePath, 'utf8');
};

exports.midLines = function () {
    // default multiline "same" collapse
    return " ...";
};

exports.midFoundLines = function () {
    // default multiline "found" collapse
    return "   ...";
};

exports.midWantedLines = function () {
    // default multiline "wanted" collapse
    return "  ...";
};

exports.numberLines = function (text, padChar, delim) {
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

exports.subst = function (str, offset, newChar) {
    return str.substr(0, offset) + newChar + str.substr(offset + 1);
};

exports.subsetLines = function (text, lineCount) {
    var regex = new RegExp("([^\n]*\n){"+ lineCount +"}");
    var matches = text.match(regex);
    return matches[0];
};

exports.testDiffs = function (t, testName, foundPair, wantedPair) {
    t.test(testName, function (t) {
        t.equal(foundPair.found, wantedPair.found,
            "collapsed found");
        t.equal(foundPair.wanted, wantedPair.wanted,
            "collapsed wanted");
        t.end();
    });
};