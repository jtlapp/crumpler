var t = require('tap');
var Crumpler = require('../');
var lib = require('./lib/library');

t.test("custom line number delimiters", function (t) {
    var crumpler = new Crumpler({
        normBracketSize: 0,
        diffBracketSize: 0,
        minNumberedLines: 4,
        lineNumberDelim: ' '
    });
    var tenLines = lib.loadFixture('ten_lines.txt');
    var tenNumLines = lib.numberLines(tenLines, '', ' ');
    var foundPair = crumpler.shortenDiff(tenLines, tenLines);
    lib.testDiffs(t, "identical with ' ' line delimiter", foundPair,
        { subject: tenNumLines, model: tenNumLines, lineNumberDelim: ' ' });

    crumpler = new Crumpler({
        normBracketSize: 0,
        diffBracketSize: 0,
        minNumberedLines: 4,
        lineNumberDelim: '. '
    });
    tenNumLines = lib.numberLines(tenLines, '', '. ');
    foundPair = crumpler.shortenDiff(tenLines, tenLines);
    lib.testDiffs(t, "identical with '. ' line delimiter", foundPair,
        { subject: tenNumLines, model: tenNumLines, lineNumberDelim: '. ' });

    t.end();
});

t.test("larger text determines whether numbering", function (t) {
    var crumpler = new Crumpler({
        normBracketSize: 0,
        diffBracketSize: 0,
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
    lib.testDiffs(t, "both two short to number", foundPair,
        { subject: twoLines, model: threeLines, lineNumberDelim: null });

    foundPair = crumpler.shortenDiff(twoLines, fourLines);
    lib.testDiffs(t, "found too short, wanted long enough", foundPair, {
        subject: twoNumLines,
        model: fourNumLines,
        lineNumberDelim: ':'
    });
    
    foundPair = crumpler.shortenDiff(fourLines, threeLines);
    lib.testDiffs(t, "found long enough, wanted too short", foundPair, {
        subject: fourNumLines,
        model: threeNumLines,
        lineNumberDelim: ':'
    });
    
    foundPair = crumpler.shortenDiff(fourLines, fiveLines);
    lib.testDiffs(t, "found and wanted both long enough", foundPair, {
        subject: fourNumLines,
        model: fiveNumLines,
        lineNumberDelim: ':'
    });
    
    t.end();
});

t.test("diff empty and numbered non-empty lines", function (t) {
    var crumpler = new Crumpler({
        minNumberedLines: 1
    });

    lib.testDiffs(t, "diff with empty found line, numbered wanted",
        crumpler.shortenDiff('', 'a'), {
            subject: '',
            model: '1:a',
            lineNumberDelim: ':'
        }
    );

    lib.testDiffs(t, "diff with empty wanted line, numbered found",
        crumpler.shortenDiff('a', ''), {
            subject: '1:a',
            model: '',
            lineNumberDelim: ':'
        }
    );

    t.end();
});

t.test("numbering inserted and removed lines", function (t) {
    var crumpler = new Crumpler({
        normBracketSize: 0,
        diffBracketSize: 0,
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
    lib.testDiffs(t, "inserted start", foundPair, {
        subject: numInsertStart,
        model: numBase,
        lineNumberDelim: ':'
    });
    foundPair = crumpler.shortenDiff(base, insertStart);
    lib.testDiffs(t, "removed start", foundPair, {
        subject: numBase,
        model: numInsertStart,
        lineNumberDelim: ':'
    });

    foundPair = crumpler.shortenDiff(insertMiddle, base);
    lib.testDiffs(t, "inserted middle", foundPair, {
        subject: numInsertMiddle,
        model: numBase,
        lineNumberDelim: ':'
    });
    foundPair = crumpler.shortenDiff(base, insertMiddle);
    lib.testDiffs(t, "removed middle", foundPair, {
        subject: numBase,
        model: numInsertMiddle,
        lineNumberDelim: ':'
    });

    foundPair = crumpler.shortenDiff(insertEnd, base);
    lib.testDiffs(t, "inserted end", foundPair, {
        subject: numInsertEnd,
        model: numBase,
        lineNumberDelim: ':'
    });
    foundPair = crumpler.shortenDiff(base, insertEnd);
    lib.testDiffs(t, "removed end", foundPair, {
        subject: numBase,
        model: numInsertEnd,
        lineNumberDelim: ':'
    });

    t.end();
});

t.test("independence of line numbering and diff line cropping", function (t) {
    var crumpler = new Crumpler({
        minNumberedLines: 2,
        maxNormLineLength: 3,
        maxLineDiffLength: 4
    });
    var skipLength = 14;
    var head = 'H'.repeat(skipLength);
    var tail = 'T'.repeat(skipLength);
    var headCrop = lib.headEllipsis(skipLength);
    var tailCrop0 = lib.tailEllipsis(skipLength);
    var tailCrop1 = lib.tailEllipsis(skipLength + 1);
    
    var wantedIn = "aaa"+ tail +"\nbbbbb"+ tail +"\nccccc"+ tail;
    var foundIn  = "aaa"+ tail +"\nddddd"+ tail +"\neeeee"+ tail;
    lib.testDiffs(t, "numbering shouldn't affect tail-cropping",
        crumpler.shortenDiff(foundIn, wantedIn), {
            model:
                "1:aaa"+ tailCrop0 +"\n"+
                "2:bbbb"+ tailCrop1 +"\n"+
                "3:cccc"+ tailCrop1,
            subject:
                "1:aaa"+ tailCrop0 +"\n"+
                "2:dddd"+ tailCrop1 +"\n"+
                "3:eeee"+ tailCrop1,
            lineNumberDelim: ':'
        }
    );

    crumpler = new Crumpler({
        minNumberedLines: 2,
        maxNormLineLength: 3,
        maxLineDiffLength: 5,
        sameHeadLengthLimit: 5,
        sameTailLengthLimit: 3
    });
    
    wantedIn = head +"aaaaabbbeee"+ tail +"\nzzz";
    foundIn  = head +"aaaaadddddeee"+ tail +"\nzzz";
    lib.testDiffs(t, "numbering shouldn't affect same head/tail-cropping",
        crumpler.shortenDiff(foundIn, wantedIn), {
            model:
                "1:"+ headCrop +"aaaaabbbeee"+ tailCrop0 +"\n2:zzz",
            subject:
                "1:"+ headCrop +"aaaaadddddeee"+ tailCrop0 +"\n2:zzz",
            lineNumberDelim: ':'
        }
    );

    t.end();
});

t.test("diff some real text", function (t) {
    var crumpler = new Crumpler({
        normBracketSize: 1,
        diffBracketSize: 0,
        maxNormLineLength: 180,
        maxLineDiffLength: 180,
        sameHeadLengthLimit: 85,
        sameTailLengthLimit: 65,
        lineNumberPadding: '0',
        indentCollapseEllipses: false
    });

    var moby = lib.loadFixture('moby_orig.txt');
    var mobyFixedUp = moby.replace("a grasshopper", "Phidippus mystaceus");
    var mobyWantedOut = lib.loadFixture('moby_wanted.txt');
    var mobyFoundOut = lib.loadFixture('moby_found.txt');
    foundPair = crumpler.shortenDiff(mobyFixedUp, moby);
    lib.testDiffs(t, "multiple head/tail-collapsed lines, numbered", foundPair,
        {
            subject: mobyFoundOut,
            model: mobyWantedOut,
            lineNumberDelim: ':'
        }
    );
    
    var mobyDefault = lib.loadFixture('moby_default.txt');
    var mobyDefaultFixedUp =
            mobyDefault.replace("a grasshopper", "Phidippus mystaceus");
    crumpler = new Crumpler(); // default leaves text rather large
    foundPair = crumpler.shortenDiff(moby, mobyFixedUp);
    lib.testDiffs(t, "default crumpler", foundPair,
        {
            subject: mobyDefault,
            model: mobyDefaultFixedUp,
            lineNumberDelim: ':'
        }
    );
    
    t.end();
});
