var t = require('tap');
var Crumpler = require('../');
var lib = require('./lib/library');
var util = require('util');

var alpha = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"; // 52

t.test("basic centered single-line diffs", function (t) {
    var crumpler = new Crumpler({
        minNumberedLines: 0
    });

    var mod = lib.subst(alpha, 26, '*');
    t.deepEqual(crumpler.shortenDiff(mod, alpha, 36), {
        found:  "[21 chars...]vwxyz*BCDE[...21 chars]",
        wanted: "[21 chars...]vwxyzABCDE[...21 chars]"
    }, "single line centered, even length");
    
    mod = lib.subst(alpha, 26, '*');
    t.deepEqual(crumpler.shortenDiff(mod, alpha, 35), {
        found:  "[22 chars...]wxyz*BCDE[...21 chars]",
        wanted: "[22 chars...]wxyzABCDE[...21 chars]"
    }, "single line centered, odd length (show more of diff)");
    
    t.end();
});
    
t.test("limits of centered line-left collapsing", function (t) {
    var crumpler = new Crumpler({
        minNumberedLines: 0
    });

    mod = lib.subst(alpha, 0, '*');
    t.deepEqual(crumpler.shortenDiff(mod, alpha, 36), {
        found:  "*bcdefghijklmnopqrstuvw[...29 chars]",
        wanted: "abcdefghijklmnopqrstuvw[...29 chars]"
    }, "centering with first char diff");
    
    mod = lib.subst(alpha, 6, '*');
    t.deepEqual(crumpler.shortenDiff(mod, alpha, 36), {
        found:  "abcdef*hijklmnopqrstuvw[...29 chars]",
        wanted: "abcdefghijklmnopqrstuvw[...29 chars]"
    }, "centering with diff at mid left collapse-string length");
    
    mod = lib.subst(alpha, 12, '*');
    t.deepEqual(crumpler.shortenDiff(mod, alpha, 36), {
        found:  "abcdefghijkl*nopqrstuvw[...29 chars]",
        wanted: "abcdefghijklmnopqrstuvw[...29 chars]"
    }, "centering with diff at left collapse-string length");
    
    mod = lib.subst(alpha, 13, '*');
    t.deepEqual(crumpler.shortenDiff(mod, alpha, 36), {
        found:  "abcdefghijklm*opqrstuvw[...29 chars]",
        wanted: "abcdefghijklmnopqrstuvw[...29 chars]"
    }, "centering with diff at left collapse-string length + 1");
    
    mod = lib.subst(alpha, 18, '*');
    t.deepEqual(crumpler.shortenDiff(mod, alpha, 36), {
        found:  "abcdefghijklmnopqr*tuvw[...29 chars]",
        wanted: "abcdefghijklmnopqrstuvw[...29 chars]"
    }, "centering at limit of no left-collapse ");
    
    mod = lib.subst(alpha, 19, '*');
    t.deepEqual(crumpler.shortenDiff(mod, alpha, 36), {
        found:  "[14 chars...]opqrs*uvwx[...28 chars]",
        wanted: "[14 chars...]opqrstuvwx[...28 chars]"
    }, "centering at limit of left-collapse ");
    
    t.end();
});

t.test("limits of centered line-right collapsing", function (t) {
    var crumpler = new Crumpler({
        minNumberedLines: 0
    });

    mod = lib.subst(alpha, 33, '*');
    t.deepEqual(crumpler.shortenDiff(mod, alpha, 36), {
        found:  "[28 chars...]CDEFG*IJKL[...14 chars]",
        wanted: "[28 chars...]CDEFGHIJKL[...14 chars]"
    }, "centering at limit of right-collapse ");

    mod = lib.subst(alpha, 34, '*');
    t.deepEqual(crumpler.shortenDiff(mod, alpha, 36), {
        found:  "[29 chars...]DEFGH*JKLMNOPQRSTUVWXYZ",
        wanted: "[29 chars...]DEFGHIJKLMNOPQRSTUVWXYZ"
    }, "centering at limit of no right-collapse");
    
    mod = lib.subst(alpha, 38, '*');
    t.deepEqual(crumpler.shortenDiff(mod, alpha, 36), {
        found:  "[29 chars...]DEFGHIJKL*NOPQRSTUVWXYZ",
        wanted: "[29 chars...]DEFGHIJKLMNOPQRSTUVWXYZ"
    }, "centering with diff at right collapse-string length + 1");

    mod = lib.subst(alpha, 39, '*');
    t.deepEqual(crumpler.shortenDiff(mod, alpha, 36), {
        found:  "[29 chars...]DEFGHIJKLM*OPQRSTUVWXYZ",
        wanted: "[29 chars...]DEFGHIJKLMNOPQRSTUVWXYZ"
    }, "centering with diff at right collapse-string length");

    mod = lib.subst(alpha, 51, '*');
    t.deepEqual(crumpler.shortenDiff(mod, alpha, 36), {
        found:  "[29 chars...]DEFGHIJKLMNOPQRSTUVWXY*",
        wanted: "[29 chars...]DEFGHIJKLMNOPQRSTUVWXYZ"
    }, "centering with diff at right-most char");
    
    var crumpler = new Crumpler({
        minNumberedLines: 0,
        collapsedStartLine: "[{n}]"
    });
    t.deepEqual(crumpler.shortenDiff(
        "1234567890abcdefg*",
        "1234567890abcdefgh", 14), {
        found:  "[7]890abcdefg*",
        wanted: "[7]890abcdefgh"
    }, "centering to force a reduction in start-collapse digits");

    t.end();
});

t.test("diffing at fixed same length", function (t) {
    var crumpler = new Crumpler({
        minNumberedLines: 0
    });

    var mod = lib.subst(alpha, 26, '*');
    t.deepEqual(crumpler.shortenDiff(mod, alpha, 36, 0), {
        found:  "[26 chars...]*BCDEFGHIJ[...16 chars]",
        wanted: "[26 chars...]ABCDEFGHIJ[...16 chars]"
    }, "no same characters requested");
    
    var mod = lib.subst(alpha, 26, '*');
    t.deepEqual(crumpler.shortenDiff(mod, alpha, 36, 2), {
        found:  "[24 chars...]yz*BCDEFGH[...18 chars]",
        wanted: "[24 chars...]yzABCDEFGH[...18 chars]"
    }, "some same characters requested");

    var mod = lib.subst(alpha, 0, '*');
    t.deepEqual(crumpler.shortenDiff(mod, alpha, 36, 10), {
        found:  "*bcdefghijklmnopqrstuvw[...29 chars]",
        wanted: "abcdefghijklmnopqrstuvw[...29 chars]"
    }, "no same characters to share");
    
    var mod = lib.subst(alpha, 14, '*');
    t.deepEqual(crumpler.shortenDiff(mod, alpha, 36, 1), {
        found:  "abcdefghijklmn*pqrstuvw[...29 chars]",
        wanted: "abcdefghijklmnopqrstuvw[...29 chars]"
    }, "requested some same char at limit of no left-collapse");
    
    var mod = lib.subst(alpha, 15, '*');
    t.deepEqual(crumpler.shortenDiff(mod, alpha, 36, 1), {
        found:  "[14 chars...]o*qrstuvwx[...28 chars]",
        wanted: "[14 chars...]opqrstuvwx[...28 chars]"
    }, "requested one same char at limit of left-collapse");

    mod = lib.subst(alpha, 51, '*');
    t.deepEqual(crumpler.shortenDiff(mod, alpha, 36, 0), {
        found:  "[29 chars...]DEFGHIJKLMNOPQRSTUVWXY*",
        wanted: "[29 chars...]DEFGHIJKLMNOPQRSTUVWXYZ"
    }, "requested no same chars but diff at right-most char");

    mod = lib.subst(alpha, 51, '*');
    t.deepEqual(crumpler.shortenDiff(mod, alpha, 36, 2), {
        found:  "[29 chars...]DEFGHIJKLMNOPQRSTUVWXY*",
        wanted: "[29 chars...]DEFGHIJKLMNOPQRSTUVWXYZ"
    }, "requested same chars but diff at right-most char");

    t.end();
});

t.test("diffing multiple long lines, unnumbered", function (t) {
    var crumpler = new Crumpler({
        minNumberedLines: 0
    });
    
    var alpha2 = lib.subst(alpha, 51, '*');
    var wantedIn = "|"+ alpha +"1\n/"+ alpha +"2\n-"+ alpha +"3\n";
    var foundIn = "|"+ alpha2 +"1\n/"+ alpha2 +"2\n-"+ alpha2 +"3\n";
    foundPair = crumpler.shortenDiff(foundIn, wantedIn, 20);
    lib.testDiffs(t, "head-collapsed series of lines", foundPair, {
        found:
            "[47 chars...]UVWXY*1\n"+
            "/abcdef[...47 chars]\n"+
            "-abcdef[...47 chars]\n",
        wanted:
            "[47 chars...]UVWXYZ1\n"+
            "/abcdef[...47 chars]\n"+
            "-abcdef[...47 chars]\n"
    });
    
    wantedIn = "|"+ alpha +"1\n==\n/"+ alpha +"2\n==\n-"+ alpha +"3\n";
    foundIn = "|"+ alpha2 +"1\n==\n/"+ alpha2 +"2\n==\n-"+ alpha2 +"3\n";
    foundPair = crumpler.shortenDiff(foundIn, wantedIn, 20);
    lib.testDiffs(t, "multiple head-collapsed lines", foundPair, {
        found:
            "[47 chars...]UVWXY*1\n==\n"+
            "[47 chars...]UVWXY*2\n==\n"+
            "[47 chars...]UVWXY*3\n",
        wanted:
            "[47 chars...]UVWXYZ1\n==\n"+
            "[47 chars...]UVWXYZ2\n==\n"+
            "[47 chars...]UVWXYZ3\n"
    });

    alpha2 = lib.subst(alpha, 26, '*');
    wantedIn = "|"+ alpha +"1\n/"+ alpha +"2\n-"+ alpha +"3\n";
    foundIn = "|"+ alpha2 +"1\n/"+ alpha2 +"2\n-"+ alpha2 +"3\n";
    foundPair = crumpler.shortenDiff(foundIn, wantedIn, 34);
    lib.testDiffs(t, "head/tail-collapsed series of lines", foundPair, {
        found:
            "[23 chars...]wxyz*BCD[...23 chars]\n"+
            "/abcdefghijklmnopqrst[...33 chars]\n"+
            "-abcdefghijklmnopqrst[...33 chars]\n",
        wanted:
            "[23 chars...]wxyzABCD[...23 chars]\n"+
            "/abcdefghijklmnopqrst[...33 chars]\n"+
            "-abcdefghijklmnopqrst[...33 chars]\n"
    });
    
    wantedIn = "|"+ alpha +"1\n==\n/"+ alpha +"2\n==\n-"+ alpha +"3\n";
    foundIn = "|"+ alpha2 +"1\n==\n/"+ alpha2 +"2\n==\n-"+ alpha2 +"3\n";
    foundPair = crumpler.shortenDiff(foundIn, wantedIn, 34);
    lib.testDiffs(t, "multiple head/tail-collapsed lines", foundPair, {
        found:
            "[23 chars...]wxyz*BCD[...23 chars]\n==\n"+
            "[23 chars...]wxyz*BCD[...23 chars]\n==\n"+
            "[23 chars...]wxyz*BCD[...23 chars]\n",
        wanted:
            "[23 chars...]wxyzABCD[...23 chars]\n==\n"+
            "[23 chars...]wxyzABCD[...23 chars]\n==\n"+
            "[23 chars...]wxyzABCD[...23 chars]\n"
    });

    t.end();
});

t.test("diffing multiple long lines, numbered", function (t) {
    var crumpler = new Crumpler();
    
    var alpha2 = lib.subst(alpha, 51, '*');
    var wantedIn = "|"+ alpha +"1\n/"+ alpha +"2\n-"+ alpha +"3\n";
    var foundIn = "|"+ alpha2 +"1\n/"+ alpha2 +"2\n-"+ alpha2 +"3\n";
    foundPair = crumpler.shortenDiff(foundIn, wantedIn, 20);
    lib.testDiffs(t, "head-collapsed series of lines, numbered", foundPair, {
        found:
            "1:[49 chars...]WXY*1\n"+
            "2:/abcd[...49 chars]\n"+
            "3:-abcd[...49 chars]\n",
        wanted:
            "1:[49 chars...]WXYZ1\n"+
            "2:/abcd[...49 chars]\n"+
            "3:-abcd[...49 chars]\n"
    });
    
    wantedIn = "|"+ alpha +"1\n==\n/"+ alpha +"2\n==\n-"+ alpha +"3\n";
    foundIn = "|"+ alpha2 +"1\n==\n/"+ alpha2 +"2\n==\n-"+ alpha2 +"3\n";
    foundPair = crumpler.shortenDiff(foundIn, wantedIn, 20);
    lib.testDiffs(t, "multiple head-collapsed lines, numbered", foundPair, {
        found:
            "1:[49 chars...]WXY*1\n2:==\n"+
            "3:[49 chars...]WXY*2\n4:==\n"+
            "5:[49 chars...]WXY*3\n",
        wanted:
            "1:[49 chars...]WXYZ1\n2:==\n"+
            "3:[49 chars...]WXYZ2\n4:==\n"+
            "5:[49 chars...]WXYZ3\n"
    });

    alpha2 = lib.subst(alpha, 26, '*');
    wantedIn = "|"+ alpha +"1\n/"+ alpha +"2\n-"+ alpha +"3\n";
    foundIn = "|"+ alpha2 +"1\n/"+ alpha2 +"2\n-"+ alpha2 +"3\n";
    foundPair = crumpler.shortenDiff(foundIn, wantedIn, 34);
    lib.testDiffs(t, "head/tail-collapsed series of lines, numbered",
        foundPair, {
        found:
            "1:[24 chars...]xyz*BC[...24 chars]\n"+
            "2:/abcdefghijklmnopqr[...35 chars]\n"+
            "3:-abcdefghijklmnopqr[...35 chars]\n",
        wanted:
            "1:[24 chars...]xyzABC[...24 chars]\n"+
            "2:/abcdefghijklmnopqr[...35 chars]\n"+
            "3:-abcdefghijklmnopqr[...35 chars]\n"
    });
    
    wantedIn = "|"+ alpha +"1\n==\n/"+ alpha +"2\n==\n-"+ alpha +"3\n";
    foundIn = "|"+ alpha2 +"1\n==\n/"+ alpha2 +"2\n==\n-"+ alpha2 +"3\n";
    foundPair = crumpler.shortenDiff(foundIn, wantedIn, 34);
    lib.testDiffs(t, "multiple head/tail-collapsed lines, numbered",
        foundPair, {
        found:
            "1:[24 chars...]xyz*BC[...24 chars]\n2:==\n"+
            "3:[24 chars...]xyz*BC[...24 chars]\n4:==\n"+
            "5:[24 chars...]xyz*BC[...24 chars]\n",
        wanted:
            "1:[24 chars...]xyzABC[...24 chars]\n2:==\n"+
            "3:[24 chars...]xyzABC[...24 chars]\n4:==\n"+
            "5:[24 chars...]xyzABC[...24 chars]\n"
    });

    t.end();
});
