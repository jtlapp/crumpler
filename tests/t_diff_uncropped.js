var t = require('tap');
var Crumpler = require('../');
var lib = require('./lib/library');
var util = require('util');

var tenLines = lib.loadFixture('ten_lines.txt');
var ALPHANUM = "abcdefghijklmnopqrstuvwxyz0123456789";

t.test("diffs with empty lines", function (t) {
    var crumpler = new Crumpler({
        minNumberedLines: 0,
        sameHeadLengthLimit: 3,
        sameTailLengthLimit: 3,
        maxLineDiffLength: 3 
    });    
    t.deepEqual(crumpler.shortenDiff('', ''),
        { subject: '', model: '', lineNumberDelim: null },
        "diff blank lines with non-zero limits");

    crumpler = new Crumpler({
        minNumberedLines: 0,
        sameHeadLengthLimit: 0,
        sameTailLengthLimit: 0,
        maxLineDiffLength: 0
    });
    t.deepEqual(crumpler.shortenDiff('', ''),
        { subject: '', model: '', lineNumberDelim: null },
        "diff blank lines with zero limits");

    crumpler = new Crumpler({
        minNumberedLines: 0,
        sameHeadLengthLimit: 0,
        sameTailLengthLimit: 0,
        maxLineDiffLength: 1
    });
    t.deepEqual(crumpler.shortenDiff('', ''),
        { subject: '', model: '', lineNumberDelim: null },
        "diff blank lines with zero limits and max diff length 1");

    t.end();
});

t.test("diffing empty and non-empty lines", function (t) {
    var crumpler = new Crumpler({
        minNumberedLines: 0,
        sameHeadLengthLimit: 1,
        sameTailLengthLimit: 1,
        maxLineDiffLength: 1
    });
    
    lib.testDiffs(t, "diff with empty found line, non-zero limits",
        crumpler.shortenDiff('', 'a'), {
            subject: '',
            model: 'a',
            lineNumberDelim: null
        }
    );

    lib.testDiffs(t, "diff with empty wanted line, non-zero limits",
        crumpler.shortenDiff('a', ''), {
            subject: 'a',
            model: '',
            lineNumberDelim: null
        }
    );

    crumpler = new Crumpler({
        minNumberedLines: 0,
        sameHeadLengthLimit: 0,
        sameTailLengthLimit: 0,
        maxLineDiffLength: 0
    });
    
    lib.testDiffs(t, "diff with empty found line, zero limits",
        crumpler.shortenDiff('', 'a'), {
            subject: '',
            model: 'a',
            lineNumberDelim: null
        }
    );

    lib.testDiffs(t, "diff with empty wanted line, zero limits",
        crumpler.shortenDiff('a', ''), {
            subject: 'a',
            model: '',
            lineNumberDelim: null
        }
    );

    crumpler = new Crumpler({
        minNumberedLines: 0,
        sameHeadLengthLimit: 0,
        sameTailLengthLimit: 0,
        maxLineDiffLength: 1
    });
    
    lib.testDiffs(t, "diff with empty found line, zero limits but max diff 1",
        crumpler.shortenDiff('', 'a'), {
            subject: '',
            model: 'a',
            lineNumberDelim: null
        }
    );

    lib.testDiffs(t, "diff with empty wanted line, zero limits but max diff 1",
        crumpler.shortenDiff('a', ''), {
            subject: 'a',
            model: '',
            lineNumberDelim: null
        }
    );

    t.end();
});

t.test("incomparable or identical diff values", function (t) {
    var crumpler = new Crumpler({
        minNumberedLines: 0,
        normBracketSize: 3,
        diffBracketSize: 4 // > normBracketSize to show using normBracketSize
    });
    
    var notStringError = new Error("model value must be a string");
    t.throws(function () {
        crumpler.shortenDiff(true, true);
    }, notStringError);

    t.throws(function () {
        crumpler.shortenDiff("abc", null);
    }, notStringError);
    
    t.deepEqual(crumpler.shortenDiff(true, "true"),
        { subject: true, model: "true", lineNumberDelim: null },
        "incomparable boolean and string");

    t.deepEqual(crumpler.shortenDiff(["abc"], "abc"),
        { subject: ["abc"], model: "abc", lineNumberDelim: null },
        "incomparable array and string");

    t.deepEqual(crumpler.shortenDiff({ x: 'abc' }, '{"x":"abc"}'),
        { subject: { x: 'abc' }, model: '{"x":"abc"}', lineNumberDelim: null },
        "incomparable object and its serialization");
        
    t.deepEqual(crumpler.shortenDiff("abc", "abc"),
        { subject: "abc", model: "abc", lineNumberDelim: null },
        "identical single-line strings");

    t.deepEqual(crumpler.shortenDiff("abc\ndef\n", "abc\ndef\n"),
        { subject: "abc\ndef\n", model: "abc\ndef\n", lineNumberDelim: null },
        "identical multi-line strings");
        
    var foundPair = crumpler.shortenDiff(tenLines, tenLines);
    var wanted = "First line.\nSecond line.\nThird line.\n"+
        lib.normEllipsis() +"\n"+
        "Eighth line.\nNineth line.\nTenth line.";
    lib.testDiffs(t, "identical 10-line strings", foundPair,
        { subject: wanted, model: wanted, lineNumberDelim: null });
    
    crumpler = new Crumpler({
        minNumberedLines: 0,
        normBracketSize: 3,
        maxNormLineLength: 10
    });
    
    foundPair = crumpler.shortenDiff(ALPHANUM, ALPHANUM);
    var wanted = "abcdefghij"+ lib.tailEllipsis(26);
    lib.testDiffs(t, "identical tail-cropped single line", foundPair,
        { subject: wanted, model: wanted, lineNumberDelim: null });
        
    var shortLine = ALPHANUM.substr(0, 10);
    var text = ALPHANUM +"\n"+ shortLine +"\n" + ALPHANUM +"\n";
    foundPair = crumpler.shortenDiff(text, text);
    wanted = wanted +"\n"+ shortLine +"\n"+ wanted +"\n";
    lib.testDiffs(t, "identical tail-cropped multiple lines", foundPair,
        { subject: wanted, model: wanted, lineNumberDelim: null });

    t.end();
});

t.test("non-collapsed diffs within maximum line length", function (t) {
    var crumpler = new Crumpler({
        minNumberedLines: 0
    });
    
    t.deepEqual(crumpler.shortenDiff("abc", "123"),
        { subject: "abc", model: "123", lineNumberDelim: null },
        "different-from-start short single-line strings");

    t.deepEqual(crumpler.shortenDiff("abc\ndef", "123\n456"),
        { subject: "abc\ndef", model: "123\n456", lineNumberDelim: null },
        "different-from-start short multiline strings");

    var wanted = "abc\n123";
    var found =  "abc\ndef";
    var foundPair = crumpler.shortenDiff(found, wanted);
    lib.testDiffs(t, "1st line same, 2nd line diff", foundPair,
        { subject: found, model: wanted, lineNumberDelim: null });

    wanted += "\n";
    var foundPair = crumpler.shortenDiff(found, wanted);
    lib.testDiffs(t, "1st line same, 2nd line diff, wanted + LF", foundPair,
        { subject: found, model: wanted, lineNumberDelim: null });
    
    wanted = "abc\n123";
    found += "\n";
    var foundPair = crumpler.shortenDiff(found, wanted);
    lib.testDiffs(t, "1st line same, 2nd line diff, found + LF", foundPair,
        { subject: found, model: wanted, lineNumberDelim: null });
    
    wanted = "123\ndef";
    found =  "abc\ndef";
    foundPair = crumpler.shortenDiff(found, wanted);
    lib.testDiffs(t, "1st line diff, 2nd line same", foundPair,
        { subject: found, model: wanted, lineNumberDelim: null });
    
    wanted = "abc\ndef\nghi\njkl";
    found =  "abc\ndef\n123\njkl";
    foundPair = crumpler.shortenDiff(found, wanted);
    lib.testDiffs(t, "increasing diff delta complexity 1", foundPair,
        { subject: found, model: wanted, lineNumberDelim: null });
    
    wanted = "abc\ndef\nghi\njkl\nmno";
    found =  "abc\ndef\n123\njkl\n456";
    foundPair = crumpler.shortenDiff(found, wanted);
    lib.testDiffs(t, "increasing diff delta complexity 2", foundPair,
        { subject: found, model: wanted, lineNumberDelim: null });
    
    wanted = "abc\ndef\nghi\njkl";
    found =  "abc\ndef\n123\n456\nghi\njkl";
    foundPair = crumpler.shortenDiff(found, wanted);
    lib.testDiffs(t, "increasing diff delta complexity 3", foundPair,
        { subject: found, model: wanted, lineNumberDelim: null });
    
    wanted = "abc\ndef\nghi\njkl\nmno";
    found =  "abc\nghi\njkl\nmno";
    foundPair = crumpler.shortenDiff(found, wanted);
    lib.testDiffs(t, "increasing diff delta complexity 4", foundPair,
        { subject: found, model: wanted, lineNumberDelim: null });

    crumpler = new Crumpler({
        minNumberedLines: 0,
        maxNormLineLength: 3,
        maxDiffLineLength: 3
    });
    wanted = "abc\n123";
    found =  "abc\ndef";
    foundPair = crumpler.shortenDiff(found, wanted);
    lib.testDiffs(t, "simple diff at maximum line length", foundPair,
        { subject: found, model: wanted, lineNumberDelim: null });

    crumpler = new Crumpler({
        minNumberedLines: 0,
        maxNormLineLength: 3,
        maxDiffLineLength: 3,
        sameHeadLengthLimit: 1
    });
    foundPair = crumpler.shortenDiff(found, wanted);
    lib.testDiffs(t, "simple diff at max line length, unused same length",
        foundPair, { subject: found, model: wanted, lineNumberDelim: null });
    
    t.end();
});

t.test("non-collapsed diffs within maximum diff length", function (t) {
    var crumpler = new Crumpler({
        minNumberedLines: 0,
        maxDiffLineLength: 3
    });
    
    t.deepEqual(crumpler.shortenDiff("abcdef", "abc123def"),
        { subject: "abcdef", model: "abc123def", lineNumberDelim: null },
        "found none at max diff length, under max line length");

    t.deepEqual(crumpler.shortenDiff("abc12def", "abc123def"),
        { subject: "abc12def", model: "abc123def", lineNumberDelim: null },
        "found fewer at max diff length, under max line length");

    t.deepEqual(crumpler.shortenDiff("abcdef", "abc1def"),
        { subject: "abcdef", model: "abc1def", lineNumberDelim: null },
        "found fewer under max diff length, under max line length");

    t.deepEqual(crumpler.shortenDiff("abc123def", "abcdef"),
        { subject: "abc123def", model: "abcdef", lineNumberDelim: null },
        "found something at max diff length, under max line length");

    t.deepEqual(crumpler.shortenDiff("abc123def", "abc12def"),
        { subject: "abc123def", model: "abc12def", lineNumberDelim: null },
        "found more at max diff length, under max line length");

    t.deepEqual(crumpler.shortenDiff("abc1def", "abcdef"),
        { subject: "abc1def", model: "abcdef", lineNumberDelim: null },
        "found more under max diff length, under max line length");

    var wantedIn = "abc\ndef123ghi\njkl\n";
    var foundIn =  "abc\ndef12ghi\njkl\n";
    foundPair = crumpler.shortenDiff(foundIn, wantedIn);
    lib.testDiffs(t, "middle line wanted more", foundPair, {
        model: "abc\ndef123ghi\njkl\n",
        subject: "abc\ndef12ghi\njkl\n",
        lineNumberDelim: null
    });

    var wantedIn = "abc\ndef12ghi\njkl\n";
    var foundIn =  "abc\ndef123ghi\njkl\n";
    foundPair = crumpler.shortenDiff(foundIn, wantedIn);
    lib.testDiffs(t, "middle line wanted fewer", foundPair, {
        model: "abc\ndef12ghi\njkl\n",
        subject: "abc\ndef123ghi\njkl\n",
        lineNumberDelim: null
    });

    t.end();
});

t.test("simple multiline collapse diffs", function (t) {
    var crumpler = new Crumpler({
        minNumberedLines: 0,
        normBracketSize: 1,
        diffBracketSize: 1
    });
    
    var wantedIn = "ABC\nDEF\nGHI\nJKL\n";
    var foundIn =  "123\n456\n789\nXYZ\n";
    foundPair = crumpler.shortenDiff(foundIn, wantedIn);
    lib.testDiffs(t, "both collapsed, diff from start", foundPair, {
        subject: "123\n"+ lib.subjectEllipsis() +"\nXYZ\n",
        model: "ABC\n"+ lib.modelEllipsis() +"\nJKL\n",
        lineNumberDelim: null
    });

    wantedIn = "ABC\nDEF\n";
    foundIn =  "123\n456\n789\nXYZ\n";
    foundPair = crumpler.shortenDiff(foundIn, wantedIn);
    lib.testDiffs(t, "only found collapsed, diff from start", foundPair, {
        subject: "123\n"+ lib.subjectEllipsis() +"\nXYZ\n",
        model: "ABC\nDEF\n",
        lineNumberDelim: null
    });
    
    wantedIn = "ABC\nDEF\nGHI\nJKL\n";
    foundIn =  "123\n456";
    foundPair = crumpler.shortenDiff(foundIn, wantedIn);
    lib.testDiffs(t, "only wanted collapsed, diff from start", foundPair, {
        subject: "123\n456",
        model: "ABC\n"+ lib.modelEllipsis() +"\nJKL\n",
        lineNumberDelim: null
    });
    
    t.end();
});

t.test("complex diffs within maximum line length", function (t) {
    var crumpler = new Crumpler({
        minNumberedLines: 0,
        normBracketSize: 1,
        diffBracketSize: 1
    });
    
    var single_a = "abcdefghij\n";
    var single_b = "abcde12345\n";
    var single_c = "abcde\n";
    var single_d = "987654321\n";

    var multi4aIn = "line1\nline2\nline3\nline4\n";
    var multi4bIn = "LINE1\nLINE2\nLINE3\nLINE4\n";
    var multi5aIn = "abc\ndef\nghi\njkl\nmno\n";
    var multi5bIn = "ABC\nDEF\nGHI\nJKL\nMNO\n";

    var multi4aOut = "line1\n%s\nline4\n";
    var multi4bOut = "LINE1\n%s\nLINE4\n";
    var multi5aOut = "abc\n%s\nmno\n";
    var multi5bOut = "ABC\n%s\nMNO\n";

    var wantedIn = single_a + multi4aIn;
    var foundIn = single_a + multi4bIn;
    var foundPair = crumpler.shortenDiff(foundIn, wantedIn);
    lib.testDiffs(t, "single same, multi diff", foundPair, {
        model: single_a + util.format(multi4aOut, lib.modelEllipsis()),
        subject: single_a + util.format(multi4bOut, lib.subjectEllipsis()),
        lineNumberDelim: null
    });

    wantedIn = single_a + multi4aIn + single_b;
    foundIn = single_a + multi4bIn + single_b;
    foundPair = crumpler.shortenDiff(foundIn, wantedIn);
    lib.testDiffs(t, "single same, multi diff, single same", foundPair, {
        model: single_a + util.format(multi4aOut, lib.modelEllipsis()) +
            single_b,
        subject: single_a + util.format(multi4bOut, lib.subjectEllipsis()) +
            single_b,
        lineNumberDelim: null
    });

    wantedIn = multi4aIn + multi5aIn;
    foundIn = multi4aIn + multi5bIn;
    foundPair = crumpler.shortenDiff(foundIn, wantedIn);
    lib.testDiffs(t, "multi same, multi diff", foundPair, {
        model: util.format(multi4aOut, lib.normEllipsis()) +
            util.format(multi5aOut, lib.modelEllipsis()),
        subject: util.format(multi4aOut, lib.normEllipsis()) +
            util.format(multi5bOut, lib.subjectEllipsis()),
        lineNumberDelim: null
    });

    wantedIn = multi4aIn + multi5aIn + multi4aIn;
    foundIn = multi4aIn + multi5bIn + multi4aIn;
    foundPair = crumpler.shortenDiff(foundIn, wantedIn);
    lib.testDiffs(t, "multi same, multi diff, multi same", foundPair, {
        model: util.format(multi4aOut, lib.normEllipsis()) +
            util.format(multi5aOut, lib.modelEllipsis()) +
            util.format(multi4aOut, lib.normEllipsis()),
        subject: util.format(multi4aOut, lib.normEllipsis()) +
            util.format(multi5bOut, lib.subjectEllipsis()) +
            util.format(multi4aOut, lib.normEllipsis()),
        lineNumberDelim: null
    });

    wantedIn = multi4aIn + single_a + multi4aIn;
    foundIn = multi4aIn + single_b + multi4aIn;
    foundPair = crumpler.shortenDiff(foundIn, wantedIn);
    lib.testDiffs(t, "multi same, single diff, multi same", foundPair, {
        model: util.format(multi4aOut, lib.normEllipsis()) +
            single_a +
            util.format(multi4aOut, lib.normEllipsis()),
        subject: util.format(multi4aOut, lib.normEllipsis()) +
            single_b +
            util.format(multi4aOut, lib.normEllipsis()),
        lineNumberDelim: null
    });

    wantedIn = single_a + multi4aIn;
    foundIn = single_b + multi4aIn;
    foundPair = crumpler.shortenDiff(foundIn, wantedIn);
    lib.testDiffs(t, "single diff, multi same", foundPair, {
        model: single_a + util.format(multi4aOut, lib.normEllipsis()),
        subject: single_b + util.format(multi4aOut, lib.normEllipsis()),
        lineNumberDelim: null
    });

    wantedIn = single_a + multi4aIn + single_c;
    foundIn = single_b + multi4aIn + single_d;
    foundPair = crumpler.shortenDiff(foundIn, wantedIn);
    lib.testDiffs(t, "single diff, multi same, single diff", foundPair, {
        model: single_a + util.format(multi4aOut, lib.normEllipsis()) + single_c,
        subject: single_b + util.format(multi4aOut, lib.normEllipsis()) + single_d,
        lineNumberDelim: null
    });

    wantedIn = multi4aIn + multi5aIn;
    foundIn = multi4bIn + multi5aIn;
    foundPair = crumpler.shortenDiff(foundIn, wantedIn);
    lib.testDiffs(t, "multi diff, multi same", foundPair, {
        model: util.format(multi4aOut, lib.modelEllipsis()) +
            util.format(multi5aOut, lib.normEllipsis()),
        subject: util.format(multi4bOut, lib.subjectEllipsis()) +
            util.format(multi5aOut, lib.normEllipsis()),
        lineNumberDelim: null
    });

    wantedIn = multi4aIn + multi5aIn + multi4bIn;
    foundIn = multi4bIn + multi5aIn + multi4aIn;
    foundPair = crumpler.shortenDiff(foundIn, wantedIn);
    lib.testDiffs(t, "multi diff, multi same, multi diff", foundPair, {
        model: util.format(multi4aOut, lib.modelEllipsis()) +
            util.format(multi5aOut, lib.normEllipsis()) +
            util.format(multi4bOut, lib.modelEllipsis()),
        subject: util.format(multi4bOut, lib.subjectEllipsis()) +
            util.format(multi5aOut, lib.normEllipsis()) +
            util.format(multi4aOut, lib.subjectEllipsis()),
        lineNumberDelim: null
    });

    wantedIn = multi4aIn + single_a + multi5aIn;
    foundIn = multi4bIn + single_a + multi5bIn;
    foundPair = crumpler.shortenDiff(foundIn, wantedIn);
    lib.testDiffs(t, "multi diff, single same, multi diff", foundPair, {
        model: util.format(multi4aOut, lib.modelEllipsis()) +
            single_a +
            util.format(multi5aOut, lib.modelEllipsis()),
        subject: util.format(multi4bOut, lib.subjectEllipsis()) +
            single_a +
            util.format(multi5bOut, lib.subjectEllipsis()),
        lineNumberDelim: null
    });

    t.end();
});
