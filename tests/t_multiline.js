var t = require('tap');
var util = require('util');
var Crumpler = require('../');
var lib = require('./lib/library');

var tenLines = lib.loadFixture('ten_lines.txt');
var LF = "\n";

t.test("default multiline collapsing", function (t) {
    var crumpler = new Crumpler({
        minNumberedLines: 0
    });
    
    t.equal(crumpler.shortenText(''), '',
        "don't collapse empty line");
        
    for (var i = 1; i <= 5; ++i) {
        wanted = lib.subsetLines(tenLines, i);
        t.equal(crumpler.shortenText(wanted), wanted,
            i +" lines are too few to collapse");
    }

    var wanted =
        "First line.\nSecond line.\n"+
        lib.midLines() +"\n"+
        "Nineth line.\nTenth line.";
    t.equal(crumpler.shortenText(tenLines), wanted,
        "no trailing LF");
    t.equal(crumpler.shortenText(tenLines) + LF, wanted + LF,
        "with trailing LF");
        
    t.equal(crumpler.shortenText(lib.subsetLines(tenLines, 6)),
        "First line.\nSecond line.\n"+
        lib.midLines() +"\n"+
        "Fifth line.\nSixth line.\n",
        "minimal shortened text of 6 lines");
    
    t.end();
});

t.test("custom multiline collapsing", function (t) {
    var crumpler = new Crumpler({
        minNumberedLines: 0,
        bracketSize: 1,
        minCollapseLines: 5
    });
    
    var text = lib.subsetLines(tenLines, 6);
    t.equal(crumpler.shortenText(text), text,
        "too few lines between prospective brackets");

    t.equal(crumpler.shortenText(lib.subsetLines(tenLines, 7)),
        "First line.\n"+ lib.midLines() +"\nSeventh line.\n",
        "min lines between prospective brackets");

    t.equal(crumpler.shortenText(tenLines),
        "First line.\n"+ lib.midLines() +"\nTenth line.",
        "ten lines bracketed by 1 each side");

    t.end();
});

t.test("shorten text with replacement collapse", function (t) {
    var wanted =
        "First line.\nSecond line.\nThird line.\n%s\n"+
        "Eighth line.\nNineth line.\nTenth line.";

    var crumpler = new Crumpler({
        minNumberedLines: 0,
        collapsedSameLines: "  (lines removed)",
        bracketSize: 3
    });
    t.equal(crumpler.shortenText(tenLines),
        util.format(wanted, "  (lines removed)"),
        "custom multiline collapse without count");
    
    var crumpler = new Crumpler({
        minNumberedLines: 0,
        collapsedSameLines: "\n...\n",
        bracketSize: 3
    });
    t.equal(crumpler.shortenText(tenLines),
        util.format(wanted, "\n...\n"),
        "custom multiline collapse having multiple lines");
    
    crumpler = new Crumpler({
        minNumberedLines: 0,
        collapsedSameLines: "... skipping {n} lines ...",
        bracketSize: 3
    });
    t.equal(crumpler.shortenText(tenLines),
        util.format(wanted, "... skipping 4 lines ..."),
        "custom multiline collapse with count");
    
    t.end();
});

t.test("shorten text with numbering", function (t) {
    var crumpler = new Crumpler({
        bracketSize: 3,
        indentCollapsedLines: true
    });

    t.equal(crumpler.shortenText(''), '',
        "non-numbered empty line");
    
    text = lib.subsetLines(tenLines, 1);
    t.equal(crumpler.shortenText(text), text,
        "1 line, too few too number, too short to crumple");

    for (var i = 2; i <= 7; ++i) {
        text = lib.subsetLines(tenLines, i);
        t.equal(crumpler.shortenText(text), lib.numberLines(text, '', ':'),
            "numbered "+ i +" lines, too short to crumple");
    }

    t.equal(crumpler.shortenText(lib.subsetLines(tenLines, 8)),
        "1:First line.\n2:Second line.\n3:Third line.\n  "+
        lib.midLines() +"\n"+
        "6:Sixth line.\n7:Seventh line.\n8:Eighth line.\n",
        "minimal shortened text of 8 lines, numbered");
        
    t.equal(crumpler.shortenText(tenLines),
        "1:First line.\n2:Second line.\n3:Third line.\n  "+
        lib.midLines() +"\n"+
        "8:Eighth line.\n9:Nineth line.\n10:Tenth line.",
        "10 lines crumpled and numbered without padding");

    t.end();
});
