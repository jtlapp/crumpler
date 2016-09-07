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
    
    var notStringError = new Error("model value must be a string");
    t.throws(function () {
        crumpler.shortenDiff(true, true);
    }, notStringError);

    t.throws(function () {
        crumpler.shortenDiff("abc", null);
    }, notStringError);
    
    t.deepEqual(crumpler.shortenDiff(true, "true"),
        { subject: true, model: "true", numbered: false },
        "incomparable boolean and string");

    t.deepEqual(crumpler.shortenDiff(["abc"], "abc"),
        { subject: ["abc"], model: "abc", numbered: false },
        "incomparable array and string");

    t.deepEqual(crumpler.shortenDiff({ x: 'abc' }, '{"x":"abc"}'),
        { subject: { x: 'abc' }, model: '{"x":"abc"}', numbered: false },
        "incomparable object and its serialization");
        
    t.deepEqual(crumpler.shortenDiff("abc", "abc"),
        { subject: "abc", model: "abc", numbered: false },
        "identical single-line strings");

    t.deepEqual(crumpler.shortenDiff("abc\ndef\n", "abc\ndef\n"),
        { subject: "abc\ndef\n", model: "abc\ndef\n", numbered: false },
        "identical multi-line strings");
        
    var foundPair = crumpler.shortenDiff(tenLines, tenLines);
    var wanted = "First line.\nSecond line.\nThird line.\n"+
        lib.midLines() +"\n"+
        "Eighth line.\nNineth line.\nTenth line.";
    lib.testDiffs(t, "identical 10-line strings", foundPair,
        { subject: wanted, model: wanted, numbered: false });
    
    foundPair = crumpler.shortenDiff(ALPHANUM, ALPHANUM, 16);
    var wanted = "abc"+ lib.endLine(33);
    lib.testDiffs(t, "identical collapsed single line", foundPair,
        { subject: wanted, model: wanted, numbered: false });

    var shortLine = ALPHANUM.substr(0, 16);
    var text = ALPHANUM +"\n"+ shortLine +"\n" + ALPHANUM +"\n";
    foundPair = crumpler.shortenDiff(text, text, 16);
    wanted = wanted +"\n"+ shortLine +"\n"+ wanted +"\n";
    lib.testDiffs(t, "identical collapsed multiple lines", foundPair,
        { subject: wanted, model: wanted, numbered: false });

    t.end();
});

t.test("non-collapsed diffs within maximum line length", function (t) {
    var crumpler = new Crumpler({
        minNumberedLines: 0
    });
    
    t.deepEqual(crumpler.shortenDiff("abc", "123"),
        { subject: "abc", model: "123", numbered: false },
        "different-from-start short single-line strings");

    t.deepEqual(crumpler.shortenDiff("abc\ndef", "123\n456"),
        { subject: "abc\ndef", model: "123\n456", numbered: false },
        "different-from-start short multiline strings");

    var wanted = "abc\n123";
    var found =  "abc\ndef";
    var foundPair = crumpler.shortenDiff(found, wanted);
    lib.testDiffs(t, "1st line same, 2nd line diff", foundPair,
        { subject: found, model: wanted, numbered: false });

    wanted += "\n";
    var foundPair = crumpler.shortenDiff(found, wanted);
    lib.testDiffs(t, "1st line same, 2nd line diff, wanted + LF", foundPair,
        { subject: found, model: wanted, numbered: false });
    
    wanted = "abc\n123";
    found += "\n";
    var foundPair = crumpler.shortenDiff(found, wanted);
    lib.testDiffs(t, "1st line same, 2nd line diff, found + LF", foundPair,
        { subject: found, model: wanted, numbered: false });
    
    wanted = "123\ndef";
    found =  "abc\ndef";
    foundPair = crumpler.shortenDiff(found, wanted);
    lib.testDiffs(t, "1st line diff, 2nd line same", foundPair,
        { subject: found, model: wanted, numbered: false });
    
    wanted = "abc\ndef\nghi\njkl";
    found =  "abc\ndef\n123\njkl";
    foundPair = crumpler.shortenDiff(found, wanted);
    lib.testDiffs(t, "increasing diff delta complexity 1", foundPair,
        { subject: found, model: wanted, numbered: false });
    
    wanted = "abc\ndef\nghi\njkl\nmno";
    found =  "abc\ndef\n123\njkl\n456";
    foundPair = crumpler.shortenDiff(found, wanted);
    lib.testDiffs(t, "increasing diff delta complexity 2", foundPair,
        { subject: found, model: wanted, numbered: false });
    
    wanted = "abc\ndef\nghi\njkl";
    found =  "abc\ndef\n123\n456\nghi\njkl";
    foundPair = crumpler.shortenDiff(found, wanted);
    lib.testDiffs(t, "increasing diff delta complexity 3", foundPair,
        { subject: found, model: wanted, numbered: false });
    
    wanted = "abc\ndef\nghi\njkl\nmno";
    found =  "abc\nghi\njkl\nmno";
    foundPair = crumpler.shortenDiff(found, wanted);
    lib.testDiffs(t, "increasing diff delta complexity 4", foundPair,
        { subject: found, model: wanted, numbered: false });

    crumpler = new Crumpler({
        minNumberedLines: 0
    });
    wanted = "abc\n123";
    found =  "abc\ndef";
    foundPair = crumpler.shortenDiff(found, wanted, 3);
    lib.testDiffs(t, "simple diff at maximum line length", foundPair,
        { subject: found, model: wanted, numbered: false });
    foundPair = crumpler.shortenDiff(found, wanted, 3, 1);
    lib.testDiffs(t, "simple diff at max line length, unused sameLength",
        foundPair, { subject: found, model: wanted, numbered: false });
    
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
        subject: "123\n"+ lib.midFoundLines() +"\nXYZ\n",
        model: "ABC\n"+ lib.midWantedLines() +"\nJKL\n",
        numbered: false
    });

    wantedIn = "ABC\nDEF\n";
    foundIn =  "123\n456\n789\nXYZ\n";
    foundPair = crumpler.shortenDiff(foundIn, wantedIn);
    lib.testDiffs(t, "only found collapsed, diff from start", foundPair, {
        subject: "123\n"+ lib.midFoundLines() +"\nXYZ\n",
        model: "ABC\nDEF\n",
        numbered: false
    });
    
    wantedIn = "ABC\nDEF\nGHI\nJKL\n";
    foundIn =  "123\n456";
    foundPair = crumpler.shortenDiff(foundIn, wantedIn);
    lib.testDiffs(t, "only wanted collapsed, diff from start", foundPair, {
        subject: "123\n456",
        model: "ABC\n"+ lib.midWantedLines() +"\nJKL\n",
        numbered: false
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
        model: single_a + util.format(multi4aOut, lib.midWantedLines()),
        subject: single_a + util.format(multi4bOut, lib.midFoundLines()),
        numbered: false
    });

    wantedIn = single_a + multi4aIn + single_b;
    foundIn = single_a + multi4bIn + single_b;
    foundPair = crumpler.shortenDiff(foundIn, wantedIn);
    lib.testDiffs(t, "single same, multi diff, single same", foundPair, {
        model: single_a + util.format(multi4aOut, lib.midWantedLines()) +
            single_b,
        subject: single_a + util.format(multi4bOut, lib.midFoundLines()) +
            single_b,
        numbered: false
    });

    wantedIn = multi4aIn + multi5aIn;
    foundIn = multi4aIn + multi5bIn;
    foundPair = crumpler.shortenDiff(foundIn, wantedIn);
    lib.testDiffs(t, "multi same, multi diff", foundPair, {
        model: util.format(multi4aOut, lib.midLines()) +
            util.format(multi5aOut, lib.midWantedLines()),
        subject: util.format(multi4aOut, lib.midLines()) +
            util.format(multi5bOut, lib.midFoundLines()),
        numbered: false
    });

    wantedIn = multi4aIn + multi5aIn + multi4aIn;
    foundIn = multi4aIn + multi5bIn + multi4aIn;
    foundPair = crumpler.shortenDiff(foundIn, wantedIn);
    lib.testDiffs(t, "multi same, multi diff, multi same", foundPair, {
        model: util.format(multi4aOut, lib.midLines()) +
            util.format(multi5aOut, lib.midWantedLines()) +
            util.format(multi4aOut, lib.midLines()),
        subject: util.format(multi4aOut, lib.midLines()) +
            util.format(multi5bOut, lib.midFoundLines()) +
            util.format(multi4aOut, lib.midLines()),
        numbered: false
    });

    wantedIn = multi4aIn + single_a + multi4aIn;
    foundIn = multi4aIn + single_b + multi4aIn;
    foundPair = crumpler.shortenDiff(foundIn, wantedIn);
    lib.testDiffs(t, "multi same, single diff, multi same", foundPair, {
        model: util.format(multi4aOut, lib.midLines()) +
            single_a +
            util.format(multi4aOut, lib.midLines()),
        subject: util.format(multi4aOut, lib.midLines()) +
            single_b +
            util.format(multi4aOut, lib.midLines()),
        numbered: false
    });

    wantedIn = single_a + multi4aIn;
    foundIn = single_b + multi4aIn;
    foundPair = crumpler.shortenDiff(foundIn, wantedIn);
    lib.testDiffs(t, "single diff, multi same", foundPair, {
        model: single_a + util.format(multi4aOut, lib.midLines()),
        subject: single_b + util.format(multi4aOut, lib.midLines()),
        numbered: false
    });

    wantedIn = single_a + multi4aIn + single_c;
    foundIn = single_b + multi4aIn + single_d;
    foundPair = crumpler.shortenDiff(foundIn, wantedIn);
    lib.testDiffs(t, "single diff, multi same, single diff", foundPair, {
        model: single_a + util.format(multi4aOut, lib.midLines()) + single_c,
        subject: single_b + util.format(multi4aOut, lib.midLines()) + single_d,
        numbered: false
    });

    wantedIn = multi4aIn + multi5aIn;
    foundIn = multi4bIn + multi5aIn;
    foundPair = crumpler.shortenDiff(foundIn, wantedIn);
    lib.testDiffs(t, "multi diff, multi same", foundPair, {
        model: util.format(multi4aOut, lib.midWantedLines()) +
            util.format(multi5aOut, lib.midLines()),
        subject: util.format(multi4bOut, lib.midFoundLines()) +
            util.format(multi5aOut, lib.midLines()),
        numbered: false
    });

    wantedIn = multi4aIn + multi5aIn + multi4bIn;
    foundIn = multi4bIn + multi5aIn + multi4aIn;
    foundPair = crumpler.shortenDiff(foundIn, wantedIn);
    lib.testDiffs(t, "multi diff, multi same, multi diff", foundPair, {
        model: util.format(multi4aOut, lib.midWantedLines()) +
            util.format(multi5aOut, lib.midLines()) +
            util.format(multi4bOut, lib.midWantedLines()),
        subject: util.format(multi4bOut, lib.midFoundLines()) +
            util.format(multi5aOut, lib.midLines()) +
            util.format(multi4aOut, lib.midFoundLines()),
        numbered: false
    });

    wantedIn = multi4aIn + single_a + multi5aIn;
    foundIn = multi4bIn + single_a + multi5bIn;
    foundPair = crumpler.shortenDiff(foundIn, wantedIn);
    lib.testDiffs(t, "multi diff, single same, multi diff", foundPair, {
        model: util.format(multi4aOut, lib.midWantedLines()) +
            single_a +
            util.format(multi5aOut, lib.midWantedLines()),
        subject: util.format(multi4bOut, lib.midFoundLines()) +
            single_a +
            util.format(multi5bOut, lib.midFoundLines()),
        numbered: false
    });

    t.end();
});
