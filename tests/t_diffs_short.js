var t = require('tap');
var Crumpler = require('../');
var lib = require('./lib/library');
var util = require('util');

var tenLines = lib.loadFixture('ten_lines.txt');
var ALPHANUM = "abcdefghijklmnopqrstuvwxyz0123456789";

t.test("incomparable or identical", function (t) {
    var crumpler = new Crumpler({
        minNumberedLines: 0,
        bracketSize: 3
    });
    
    var notStringError = new Error("wanted value must be a string");
    t.throws(function () {
        crumpler.shortenDiff(true, true);
    }, notStringError);

    t.throws(function () {
        crumpler.shortenDiff("abc", null);
    }, notStringError);
    
    t.deepEqual(crumpler.shortenDiff(true, "true"),
        { found: true, wanted: "true" },
        "incomparable boolean and string");

    t.deepEqual(crumpler.shortenDiff(["abc"], "abc"),
        { found: ["abc"], wanted: "abc" },
        "incomparable array and string");

    t.deepEqual(crumpler.shortenDiff({ x: 'abc' }, '{"x":"abc"}'),
        { found: { x: 'abc' }, wanted: '{"x":"abc"}' },
        "incomparable object and its serialization");
        
    t.deepEqual(crumpler.shortenDiff("abc", "abc"),
        { found: "abc", wanted: "abc" },
        "identical single-line strings");

    t.deepEqual(crumpler.shortenDiff("abc\ndef\n", "abc\ndef\n"),
        { found: "abc\ndef\n", wanted: "abc\ndef\n" },
        "identical multi-line strings");
        
    var foundPair = crumpler.shortenDiff(tenLines, tenLines);
    var wanted = "First line.\nSecond line.\nThird line.\n"+
        lib.midLines() +"\n"+
        "Eighth line.\nNineth line.\nTenth line.";
    lib.testDiffs(t, "identical 10-line strings", foundPair,
        { found: wanted, wanted: wanted });
    
    foundPair = crumpler.shortenDiff(ALPHANUM, ALPHANUM, 16);
    var wanted = "abc"+ lib.endLine(33);
    lib.testDiffs(t, "identical collapsed single line", foundPair,
        { found: wanted, wanted: wanted });

    var shortLine = ALPHANUM.substr(0, 16);
    var text = ALPHANUM +"\n"+ shortLine +"\n" + ALPHANUM +"\n";
    foundPair = crumpler.shortenDiff(text, text, 16);
    wanted = wanted +"\n"+ shortLine +"\n"+ wanted +"\n";
    lib.testDiffs(t, "identical collapsed multiple lines", foundPair,
        { found: wanted, wanted: wanted });

    t.end();
});

t.test("non-collapsed diffs within maximum line length", function (t) {
    var crumpler = new Crumpler({
        minNumberedLines: 0
    });
    
    t.deepEqual(crumpler.shortenDiff("abc", "123"),
        { found: "abc", wanted: "123" },
        "different-from-start short single-line strings");

    t.deepEqual(crumpler.shortenDiff("abc\ndef", "123\n456"),
        { found: "abc\ndef", wanted: "123\n456" },
        "different-from-start short multiline strings");

    var wanted = "abc\n123";
    var found =  "abc\ndef";
    var foundPair = crumpler.shortenDiff(found, wanted);
    lib.testDiffs(t, "1st line same, 2nd line diff", foundPair,
        { found: found, wanted: wanted });

    wanted += "\n";
    var foundPair = crumpler.shortenDiff(found, wanted);
    lib.testDiffs(t, "1st line same, 2nd line diff, wanted + LF", foundPair,
        { found: found, wanted: wanted });
    
    wanted = "abc\n123";
    found += "\n";
    var foundPair = crumpler.shortenDiff(found, wanted);
    lib.testDiffs(t, "1st line same, 2nd line diff, found + LF", foundPair,
        { found: found, wanted: wanted });
    
    wanted = "123\ndef";
    found =  "abc\ndef";
    foundPair = crumpler.shortenDiff(found, wanted);
    lib.testDiffs(t, "1st line diff, 2nd line same", foundPair,
        { found: found, wanted: wanted });
    
    wanted = "abc\ndef\nghi\njkl";
    found =  "abc\ndef\n123\njkl";
    foundPair = crumpler.shortenDiff(found, wanted);
    lib.testDiffs(t, "increasing diff delta complexity 1", foundPair,
        { found: found, wanted: wanted });
    
    wanted = "abc\ndef\nghi\njkl\nmno";
    found =  "abc\ndef\n123\njkl\n456";
    foundPair = crumpler.shortenDiff(found, wanted);
    lib.testDiffs(t, "increasing diff delta complexity 2", foundPair,
        { found: found, wanted: wanted });
    
    wanted = "abc\ndef\nghi\njkl";
    found =  "abc\ndef\n123\n456\nghi\njkl";
    foundPair = crumpler.shortenDiff(found, wanted);
    lib.testDiffs(t, "increasing diff delta complexity 3", foundPair,
        { found: found, wanted: wanted });
    
    wanted = "abc\ndef\nghi\njkl\nmno";
    found =  "abc\nghi\njkl\nmno";
    foundPair = crumpler.shortenDiff(found, wanted);
    lib.testDiffs(t, "increasing diff delta complexity 4", foundPair,
        { found: found, wanted: wanted });

    crumpler = new Crumpler({
        minNumberedLines: 0
    });
    wanted = "abc\n123";
    found =  "abc\ndef";
    foundPair = crumpler.shortenDiff(found, wanted, 3);
    lib.testDiffs(t, "simple diff at maximum line length", foundPair,
        { found: found, wanted: wanted });
    foundPair = crumpler.shortenDiff(found, wanted, 3, 1);
    lib.testDiffs(t, "simple diff at max line length, unused sameLength",
        foundPair, { found: found, wanted: wanted });
    
    t.end();
});

t.test("simple multiline collapse diffs", function (t) {
    var crumpler = new Crumpler({
        minNumberedLines: 0,
        bracketSize: 1
    });
    
    var wantedIn = "ABC\nDEF\nGHI\nJKL\n";
    var foundIn =  "123\n456\n789\nXYZ\n";
    foundPair = crumpler.shortenDiff(foundIn, wantedIn);
    lib.testDiffs(t, "both collapsed, diff from start", foundPair, {
        found: "123\n"+ lib.midFoundLines() +"\nXYZ\n",
        wanted: "ABC\n"+ lib.midWantedLines() +"\nJKL\n"
    });

    wantedIn = "ABC\nDEF\n";
    foundIn =  "123\n456\n789\nXYZ\n";
    foundPair = crumpler.shortenDiff(foundIn, wantedIn);
    lib.testDiffs(t, "only found collapsed, diff from start", foundPair, {
        found: "123\n"+ lib.midFoundLines() +"\nXYZ\n",
        wanted: "ABC\nDEF\n"
    });
    
    wantedIn = "ABC\nDEF\nGHI\nJKL\n";
    foundIn =  "123\n456";
    foundPair = crumpler.shortenDiff(foundIn, wantedIn);
    lib.testDiffs(t, "only wanted collapsed, diff from start", foundPair, {
        found: "123\n456",
        wanted: "ABC\n"+ lib.midWantedLines() +"\nJKL\n"
    });
    
    t.end();
});

t.test("complex diffs within maximum line length", function (t) {
    var crumpler = new Crumpler({
        minNumberedLines: 0,
        bracketSize: 1
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
        wanted: single_a + util.format(multi4aOut, lib.midWantedLines()),
        found: single_a + util.format(multi4bOut, lib.midFoundLines())
    });

    wantedIn = single_a + multi4aIn + single_b;
    foundIn = single_a + multi4bIn + single_b;
    foundPair = crumpler.shortenDiff(foundIn, wantedIn);
    lib.testDiffs(t, "single same, multi diff, single same", foundPair, {
        wanted: single_a + util.format(multi4aOut, lib.midWantedLines()) +
            single_b,
        found: single_a + util.format(multi4bOut, lib.midFoundLines()) +
            single_b
    });

    wantedIn = multi4aIn + multi5aIn;
    foundIn = multi4aIn + multi5bIn;
    foundPair = crumpler.shortenDiff(foundIn, wantedIn);
    lib.testDiffs(t, "multi same, multi diff", foundPair, {
        wanted: util.format(multi4aOut, lib.midLines()) +
            util.format(multi5aOut, lib.midWantedLines()),
        found: util.format(multi4aOut, lib.midLines()) +
            util.format(multi5bOut, lib.midFoundLines())
    });

    wantedIn = multi4aIn + multi5aIn + multi4aIn;
    foundIn = multi4aIn + multi5bIn + multi4aIn;
    foundPair = crumpler.shortenDiff(foundIn, wantedIn);
    lib.testDiffs(t, "multi same, multi diff, multi same", foundPair, {
        wanted: util.format(multi4aOut, lib.midLines()) +
            util.format(multi5aOut, lib.midWantedLines()) +
            util.format(multi4aOut, lib.midLines()),
        found: util.format(multi4aOut, lib.midLines()) +
            util.format(multi5bOut, lib.midFoundLines()) +
            util.format(multi4aOut, lib.midLines())
    });

    wantedIn = multi4aIn + single_a + multi4aIn;
    foundIn = multi4aIn + single_b + multi4aIn;
    foundPair = crumpler.shortenDiff(foundIn, wantedIn);
    lib.testDiffs(t, "multi same, single diff, multi same", foundPair, {
        wanted: util.format(multi4aOut, lib.midLines()) +
            single_a +
            util.format(multi4aOut, lib.midLines()),
        found: util.format(multi4aOut, lib.midLines()) +
            single_b +
            util.format(multi4aOut, lib.midLines())
    });

    wantedIn = single_a + multi4aIn;
    foundIn = single_b + multi4aIn;
    foundPair = crumpler.shortenDiff(foundIn, wantedIn);
    lib.testDiffs(t, "single diff, multi same", foundPair, {
        wanted: single_a + util.format(multi4aOut, lib.midLines()),
        found: single_b + util.format(multi4aOut, lib.midLines())
    });

    wantedIn = single_a + multi4aIn + single_c;
    foundIn = single_b + multi4aIn + single_d;
    foundPair = crumpler.shortenDiff(foundIn, wantedIn);
    lib.testDiffs(t, "single diff, multi same, single diff", foundPair, {
        wanted: single_a + util.format(multi4aOut, lib.midLines()) + single_c,
        found: single_b + util.format(multi4aOut, lib.midLines()) + single_d
    });

    wantedIn = multi4aIn + multi5aIn;
    foundIn = multi4bIn + multi5aIn;
    foundPair = crumpler.shortenDiff(foundIn, wantedIn);
    lib.testDiffs(t, "multi diff, multi same", foundPair, {
        wanted: util.format(multi4aOut, lib.midWantedLines()) +
            util.format(multi5aOut, lib.midLines()),
        found: util.format(multi4bOut, lib.midFoundLines()) +
            util.format(multi5aOut, lib.midLines())
    });

    wantedIn = multi4aIn + multi5aIn + multi4bIn;
    foundIn = multi4bIn + multi5aIn + multi4aIn;
    foundPair = crumpler.shortenDiff(foundIn, wantedIn);
    lib.testDiffs(t, "multi diff, multi same, multi diff", foundPair, {
        wanted: util.format(multi4aOut, lib.midWantedLines()) +
            util.format(multi5aOut, lib.midLines()) +
            util.format(multi4bOut, lib.midWantedLines()),
        found: util.format(multi4bOut, lib.midFoundLines()) +
            util.format(multi5aOut, lib.midLines()) +
            util.format(multi4aOut, lib.midFoundLines())
    });

    wantedIn = multi4aIn + single_a + multi5aIn;
    foundIn = multi4bIn + single_a + multi5bIn;
    foundPair = crumpler.shortenDiff(foundIn, wantedIn);
    lib.testDiffs(t, "multi diff, single same, multi diff", foundPair, {
        wanted: util.format(multi4aOut, lib.midWantedLines()) +
            single_a +
            util.format(multi5aOut, lib.midWantedLines()),
        found: util.format(multi4bOut, lib.midFoundLines()) +
            single_a +
            util.format(multi5bOut, lib.midFoundLines())
    });

    t.end();
});
