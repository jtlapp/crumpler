var t = require('tap');
var Crumpler = require('../');
var lib = require('./lib/library');

t.test("larger text determines whether numbering", function (t) {
    var crumpler = new Crumpler({
        bracketSize: 0,
        minNumberedLines: 4
    });

    var tenLines = lib.loadFixture('ten_lines.txt');
    var twoLines = lib.subsetLines(tenLines, 2);
    var threeLines = lib.subsetLines(tenLines, 3);
    var fourLines = lib.subsetLines(tenLines, 4);
    var fiveLines = lib.subsetLines(tenLines, 5);
    
    var twoNumLines = lib.numberLines(twoLines);
    var threeNumLines = lib.numberLines(threeLines);
    var fourNumLines = lib.numberLines(fourLines);
    var fiveNumLines = lib.numberLines(fiveLines);
    
    var foundPair = crumpler.shortenDiff(twoLines, threeLines);
    lib.testDiffs(t, "both two short to number",
        foundPair, { found: twoLines, wanted: threeLines });

    foundPair = crumpler.shortenDiff(twoLines, fourLines);
    lib.testDiffs(t, "found too short, wanted long enough",
        foundPair, { found: twoNumLines, wanted: fourNumLines });
    
    foundPair = crumpler.shortenDiff(fourLines, threeLines);
    lib.testDiffs(t, "found long enough, wanted too short",
        foundPair, { found: fourNumLines, wanted: threeNumLines });
    
    foundPair = crumpler.shortenDiff(fourLines, fiveLines);
    lib.testDiffs(t, "found and wanted both long enough",
        foundPair, { found: fourNumLines, wanted: fiveNumLines });
    
    t.end();
});

t.test("numbering inserted and removed lines", function (t) {
    var crumpler = new Crumpler({
        bracketSize: 0,
        minNumberedLines: 2
    });

    var base = "line 1\nline 2\nline 3\nline 4\nline 5\n";
    var insertStart = "abc\ndef\nline 1\nline 2\nline 3\nline 4\nline 5\n";
    var insertMiddle = "line 1\nline 2\nabc\ndef\nline 3\nline 4\nline 5\n";
    var insertEnd = "line 1\nline 2\nline 3\nline 4\nline 5\nabc\ndef\n";
    
    var numBase = lib.numberLines(base);
    var numInsertStart = lib.numberLines(insertStart);
    var numInsertMiddle = lib.numberLines(insertMiddle);
    var numInsertEnd = lib.numberLines(insertEnd);
    
    var foundPair = crumpler.shortenDiff(insertStart, base);
    lib.testDiffs(t, "inserted start",
        foundPair, { found: numInsertStart, wanted: numBase });
    foundPair = crumpler.shortenDiff(base, insertStart);
    lib.testDiffs(t, "removed start",
        foundPair, { found: numBase, wanted: numInsertStart });

    foundPair = crumpler.shortenDiff(insertMiddle, base);
    lib.testDiffs(t, "inserted middle",
        foundPair, { found: numInsertMiddle, wanted: numBase });
    foundPair = crumpler.shortenDiff(base, insertMiddle);
    lib.testDiffs(t, "removed middle",
        foundPair, { found: numBase, wanted: numInsertMiddle });

    foundPair = crumpler.shortenDiff(insertEnd, base);
    lib.testDiffs(t, "inserted end",
        foundPair, { found: numInsertEnd, wanted: numBase });
    foundPair = crumpler.shortenDiff(base, insertEnd);
    lib.testDiffs(t, "removed end",
        foundPair, { found: numBase, wanted: numInsertEnd });

    t.end();
});

t.test("diff real text", function (t) {
    var crumpler = new Crumpler({
        bracketSize: 1,
        lineNumberPadding: '0',
        indentCollapsedLines: false
    });

    var moby = lib.loadFixture('moby_orig.txt');
    var mobyFixedUp = moby.replace("a grasshopper", "Phidippus mystaceus");
    var mobyWantedOut = lib.loadFixture('moby_wanted.txt');
    var mobyFoundOut = lib.loadFixture('moby_found.txt');
    foundPair = crumpler.shortenDiff(mobyFixedUp, moby, 200);
    lib.testDiffs(t, "multiple head/tail-collapsed lines, numbered",
        foundPair, { found: mobyFoundOut, wanted: mobyWantedOut });

    t.end();
});
