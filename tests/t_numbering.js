var t = require('tap');
var Crumpler = require('../');
var lib = require('./lib/library');

var alpha = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"; // 52
var tenLines = lib.loadFixture('ten_lines.txt');

t.test("minimum numbered lines", function (t) {
    var crumpler = new Crumpler({
        minNumberedLines: 1
    });
    t.equal(crumpler.shortenText("First line."), "1:First line.",
        "single numbered line, no LF");
    t.equal(crumpler.shortenText("First line.\n"), "1:First line.\n",
        "single numbered line, with LF");
    t.equal(crumpler.shortenText("First line.\nSecond line."),
        "1:First line.\n2:Second line.",
        "two numbered lines");

    crumpler = new Crumpler({
        minNumberedLines: 4
    });
    var text = lib.subsetLines(tenLines, 3);
    t.equal(crumpler.shortenText(text), text,
        "three unnumbered lines, 4 required");
    text = lib.subsetLines(tenLines, 4);
    t.equal(crumpler.shortenText(text),
        lib.numberLines(text, '', ':'),
        "min 4 numbered lines, as required");
    
    t.end();
});

t.test("numbering with padding, indented collapsed lines", function (t) {
    var crumpler = new Crumpler({
        lineNumberPadding: '0',
        indentCollapsedLines: true,
        lineNumberDelim: ': ',
        bracketSize: 3
    });

    t.equal(crumpler.shortenText(lib.subsetLines(tenLines, 8)),
        "1: First line.\n2: Second line.\n3: Third line.\n   "+
        lib.midLines() +"\n"+
        "6: Sixth line.\n7: Seventh line.\n8: Eighth line.\n",
        "not enough lines for number padding");
    
    t.equal(crumpler.shortenText(tenLines),
        "01: First line.\n02: Second line.\n03: Third line.\n    "+
        lib.midLines() +"\n"+
        "08: Eighth line.\n09: Nineth line.\n10: Tenth line.",
        "enough lines for number padding");

    t.end();
});

t.test("numbering with padding, unindented collapsed lines", function (t) {
    var crumpler = new Crumpler({
        lineNumberPadding: ' ',
        indentCollapsedLines: false,
        lineNumberDelim: '. ',
        bracketSize: 3
    });

    t.equal(crumpler.shortenText(lib.subsetLines(tenLines, 8)),
        "1. First line.\n2. Second line.\n3. Third line.\n"+
        lib.midLines() +"\n"+
        "6. Sixth line.\n7. Seventh line.\n8. Eighth line.\n",
        "not enough lines for number padding");
    
    t.equal(crumpler.shortenText(tenLines),
        " 1. First line.\n 2. Second line.\n 3. Third line.\n"+
        lib.midLines() +"\n"+
        " 8. Eighth line.\n 9. Nineth line.\n10. Tenth line.",
        "enough lines for number padding");

    t.end();
});

t.test("numbering w/out padding but no delimeter, indented collapsed",
function (t) {
    var crumpler = new Crumpler({
        indentCollapsedLines: true,
        lineNumberDelim: '',
        bracketSize: 3
    });

    t.equal(crumpler.shortenText(lib.subsetLines(tenLines, 8)),
        "1First line.\n2Second line.\n3Third line.\n "+
        lib.midLines() +"\n"+
        "6Sixth line.\n7Seventh line.\n8Eighth line.\n",
        "no contribution to ident from delim");

    t.end();
});

t.test("numbering right-collapsing lines", function (t) {
    var crumpler = new Crumpler();
    var text = "|"+ alpha +"\n/"+ alpha +"\n-"+ alpha +"\n";
    t.equal(crumpler.shortenLines(text, 26),
        "1:|abcdefghij[...42 chars]\n"+
        "2:/abcdefghij[...42 chars]\n"+
        "3:-abcdefghij[...42 chars]\n",
        "numbering without padding");

    crumpler = new Crumpler({
        lineNumberPadding: '0',
        lineNumberDelim: '. '
    });
    text = text + text + text + text;
    t.equal(crumpler.shortenLines(text, 26),
        "01. |abcdefgh[...44 chars]\n"+
        "02. /abcdefgh[...44 chars]\n"+
        "03. -abcdefgh[...44 chars]\n"+
        "04. |abcdefgh[...44 chars]\n"+
        "05. /abcdefgh[...44 chars]\n"+
        "06. -abcdefgh[...44 chars]\n"+
        "07. |abcdefgh[...44 chars]\n"+
        "08. /abcdefgh[...44 chars]\n"+
        "09. -abcdefgh[...44 chars]\n"+
        "10. |abcdefgh[...44 chars]\n"+
        "11. /abcdefgh[...44 chars]\n"+
        "12. -abcdefgh[...44 chars]\n",
        "numbering with padding");

    t.end();
});
