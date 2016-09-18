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
    t.equal(crumpler.shortenText(''), '',
        "no lines, no numbering (no LF)");
    t.equal(crumpler.shortenText('\n'), '1:\n',
        "numbered empty line, with LF");
    t.equal(crumpler.shortenText("First line.\n\nThird line."),
        "1:First line.\n2:\n3:Third line.",
        "numbered middle blank line");
    t.equal(crumpler.shortenText("First line.\nSecond line.\n\n"),
        "1:First line.\n2:Second line.\n3:\n",
        "numbered trailing blank line");

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

t.test("numbering with padding, indented collapse ellipses", function (t) {
    var crumpler = new Crumpler({
        lineNumberPadding: '0',
        indentCollapseEllipses: true,
        lineNumberDelim: ': ',
        normBracketSize: 3
    });

    t.equal(crumpler.shortenText(lib.subsetLines(tenLines, 8)),
        "1: First line.\n2: Second line.\n3: Third line.\n   "+
        lib.normEllipsis() +"\n"+
        "6: Sixth line.\n7: Seventh line.\n8: Eighth line.\n",
        "not enough lines for number padding");
    
    t.equal(crumpler.shortenText(tenLines),
        "01: First line.\n02: Second line.\n03: Third line.\n    "+
        lib.normEllipsis() +"\n"+
        "08: Eighth line.\n09: Nineth line.\n10: Tenth line.",
        "enough lines for number padding");
        
    crumpler = new Crumpler({
        lineNumberPadding: '0',
        normCollapseEllipsis: "...\n  skipped lines\n...",
        indentCollapseEllipses: true,
        lineNumberDelim: ': ',
        normBracketSize: 3
    });

    t.equal(crumpler.shortenText(tenLines),
        "01: First line.\n02: Second line.\n03: Third line.\n"+
        "    ...\n      skipped lines\n    ...\n"+
        "08: Eighth line.\n09: Nineth line.\n10: Tenth line.",
        "collapse with multiline ellipsis indented by numbering");
        
    t.end();
});

t.test("numbering with padding, unindented collapse ellipses", function (t) {
    var crumpler = new Crumpler({
        lineNumberPadding: ' ',
        indentCollapseEllipses: false,
        lineNumberDelim: '. ',
        normBracketSize: 3
    });

    t.equal(crumpler.shortenText(lib.subsetLines(tenLines, 8)),
        "1. First line.\n2. Second line.\n3. Third line.\n"+
        lib.normEllipsis() +"\n"+
        "6. Sixth line.\n7. Seventh line.\n8. Eighth line.\n",
        "not enough lines for number padding");
    
    t.equal(crumpler.shortenText(tenLines),
        " 1. First line.\n 2. Second line.\n 3. Third line.\n"+
        lib.normEllipsis() +"\n"+
        " 8. Eighth line.\n 9. Nineth line.\n10. Tenth line.",
        "enough lines for number padding");

    t.end();
});

t.test("numbering w/out padding but no delim, indent collapse ellipses",
function (t) {
    var crumpler = new Crumpler({
        indentCollapseEllipses: true,
        lineNumberDelim: '',
        normBracketSize: 3
    });

    t.equal(crumpler.shortenText(lib.subsetLines(tenLines, 8)),
        "1First line.\n2Second line.\n3Third line.\n "+
        lib.normEllipsis() +"\n"+
        "6Sixth line.\n7Seventh line.\n8Eighth line.\n",
        "no contribution to ident from delim");

    t.end();
});

t.test("numbering tail-cropped lines", function (t) {
    var crumpler = new Crumpler({
        normBracketSize: 0
    });
    var text = "|"+ alpha +"\n/"+ alpha +"\n-"+ alpha +"\n";
    t.equal(crumpler.shortenText(text, 26),
        "1:|abcdefghijklmnopqrstuvwxy[...27 chars]\n"+
        "2:/abcdefghijklmnopqrstuvwxy[...27 chars]\n"+
        "3:-abcdefghijklmnopqrstuvwxy[...27 chars]\n",
        "numbering without padding");

    crumpler = new Crumpler({
        normBracketSize: 0,
        lineNumberPadding: '0',
        lineNumberDelim: '. '
    });
    text = text + text + text + text;
    t.equal(crumpler.shortenText(text, 26),
        "01. |abcdefghijklmnopqrstuvwxy[...27 chars]\n"+
        "02. /abcdefghijklmnopqrstuvwxy[...27 chars]\n"+
        "03. -abcdefghijklmnopqrstuvwxy[...27 chars]\n"+
        "04. |abcdefghijklmnopqrstuvwxy[...27 chars]\n"+
        "05. /abcdefghijklmnopqrstuvwxy[...27 chars]\n"+
        "06. -abcdefghijklmnopqrstuvwxy[...27 chars]\n"+
        "07. |abcdefghijklmnopqrstuvwxy[...27 chars]\n"+
        "08. /abcdefghijklmnopqrstuvwxy[...27 chars]\n"+
        "09. -abcdefghijklmnopqrstuvwxy[...27 chars]\n"+
        "10. |abcdefghijklmnopqrstuvwxy[...27 chars]\n"+
        "11. /abcdefghijklmnopqrstuvwxy[...27 chars]\n"+
        "12. -abcdefghijklmnopqrstuvwxy[...27 chars]\n",
        "numbering with padding");

    t.end();
});
