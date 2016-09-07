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
        subject:  "[21 chars...]vwxyz*BCDE[...21 chars]",
        model: "[21 chars...]vwxyzABCDE[...21 chars]",
        numbered: false
    }, "single line centered, even length");
    
    mod = lib.subst(alpha, 26, '*');
    t.deepEqual(crumpler.shortenDiff(mod, alpha, 35), {
        subject:  "[22 chars...]wxyz*BCDE[...21 chars]",
        model: "[22 chars...]wxyzABCDE[...21 chars]",
        numbered: false
    }, "single line centered, odd length (show more of diff)");
    
    t.end();
});
    
t.test("limits of centered line-left collapsing", function (t) {
    var crumpler = new Crumpler({
        minNumberedLines: 0
    });

    mod = lib.subst(alpha, 0, '*');
    t.deepEqual(crumpler.shortenDiff(mod, alpha, 36), {
        subject:  "*bcdefghijklmnopqrstuvw[...29 chars]",
        model: "abcdefghijklmnopqrstuvw[...29 chars]",
        numbered: false
    }, "centering with first char diff");
    
    mod = lib.subst(alpha, 6, '*');
    t.deepEqual(crumpler.shortenDiff(mod, alpha, 36), {
        subject:  "abcdef*hijklmnopqrstuvw[...29 chars]",
        model: "abcdefghijklmnopqrstuvw[...29 chars]",
        numbered: false
    }, "centering with diff at mid left collapse-string length");
    
    mod = lib.subst(alpha, 12, '*');
    t.deepEqual(crumpler.shortenDiff(mod, alpha, 36), {
        subject:  "abcdefghijkl*nopqrstuvw[...29 chars]",
        model: "abcdefghijklmnopqrstuvw[...29 chars]",
        numbered: false
    }, "centering with diff at left collapse-string length");
    
    mod = lib.subst(alpha, 13, '*');
    t.deepEqual(crumpler.shortenDiff(mod, alpha, 36), {
        subject:  "abcdefghijklm*opqrstuvw[...29 chars]",
        model: "abcdefghijklmnopqrstuvw[...29 chars]",
        numbered: false
    }, "centering with diff at left collapse-string length + 1");
    
    mod = lib.subst(alpha, 18, '*');
    t.deepEqual(crumpler.shortenDiff(mod, alpha, 36), {
        subject:  "abcdefghijklmnopqr*tuvw[...29 chars]",
        model: "abcdefghijklmnopqrstuvw[...29 chars]",
        numbered: false
    }, "centering at limit of no left-collapse ");
    
    mod = lib.subst(alpha, 19, '*');
    t.deepEqual(crumpler.shortenDiff(mod, alpha, 36), {
        subject:  "[14 chars...]opqrs*uvwx[...28 chars]",
        model: "[14 chars...]opqrstuvwx[...28 chars]",
        numbered: false
    }, "centering at limit of left-collapse ");
    
    t.end();
});

t.test("limits of centered line-right collapsing", function (t) {
    var crumpler = new Crumpler({
        minNumberedLines: 0
    });

    mod = lib.subst(alpha, 33, '*');
    t.deepEqual(crumpler.shortenDiff(mod, alpha, 36), {
        subject:  "[28 chars...]CDEFG*IJKL[...14 chars]",
        model: "[28 chars...]CDEFGHIJKL[...14 chars]",
        numbered: false
    }, "centering at limit of right-collapse ");

    mod = lib.subst(alpha, 34, '*');
    t.deepEqual(crumpler.shortenDiff(mod, alpha, 36), {
        subject:  "[29 chars...]DEFGH*JKLMNOPQRSTUVWXYZ",
        model: "[29 chars...]DEFGHIJKLMNOPQRSTUVWXYZ",
        numbered: false
    }, "centering at limit of no right-collapse");
    
    mod = lib.subst(alpha, 38, '*');
    t.deepEqual(crumpler.shortenDiff(mod, alpha, 36), {
        subject:  "[29 chars...]DEFGHIJKL*NOPQRSTUVWXYZ",
        model: "[29 chars...]DEFGHIJKLMNOPQRSTUVWXYZ",
        numbered: false
    }, "centering with diff at right collapse-string length + 1");

    mod = lib.subst(alpha, 39, '*');
    t.deepEqual(crumpler.shortenDiff(mod, alpha, 36), {
        subject:  "[29 chars...]DEFGHIJKLM*OPQRSTUVWXYZ",
        model: "[29 chars...]DEFGHIJKLMNOPQRSTUVWXYZ",
        numbered: false
    }, "centering with diff at right collapse-string length");

    mod = lib.subst(alpha, 51, '*');
    t.deepEqual(crumpler.shortenDiff(mod, alpha, 36), {
        subject:  "[29 chars...]DEFGHIJKLMNOPQRSTUVWXY*",
        model: "[29 chars...]DEFGHIJKLMNOPQRSTUVWXYZ",
        numbered: false
    }, "centering with diff at right-most char");
    
    var crumpler = new Crumpler({
        minNumberedLines: 0,
        headCropEllipsis: "[{n}]"
    });
    t.deepEqual(crumpler.shortenDiff(
        "1234567890abcdefg*",
        "1234567890abcdefgh", 14), {
        subject:  "[7]890abcdefg*",
        model: "[7]890abcdefgh",
        numbered: false
    }, "centering to force a reduction in start-collapse digits");

    t.end();
});

t.test("diffing at fixed same length", function (t) {
    var crumpler = new Crumpler({
        minNumberedLines: 0
    });

    var mod = lib.subst(alpha, 26, '*');
    t.deepEqual(crumpler.shortenDiff(mod, alpha, 36, 0), {
        subject:  "[26 chars...]*BCDEFGHIJ[...16 chars]",
        model: "[26 chars...]ABCDEFGHIJ[...16 chars]",
        numbered: false
    }, "no same characters requested");
    
    var mod = lib.subst(alpha, 26, '*');
    t.deepEqual(crumpler.shortenDiff(mod, alpha, 36, 2), {
        subject:  "[24 chars...]yz*BCDEFGH[...18 chars]",
        model: "[24 chars...]yzABCDEFGH[...18 chars]",
        numbered: false
    }, "some same characters requested");

    var mod = lib.subst(alpha, 0, '*');
    t.deepEqual(crumpler.shortenDiff(mod, alpha, 36, 10), {
        subject:  "*bcdefghijklmnopqrstuvw[...29 chars]",
        model: "abcdefghijklmnopqrstuvw[...29 chars]",
        numbered: false
    }, "no same characters to share");
    
    var mod = lib.subst(alpha, 14, '*');
    t.deepEqual(crumpler.shortenDiff(mod, alpha, 36, 1), {
        subject:  "abcdefghijklmn*pqrstuvw[...29 chars]",
        model: "abcdefghijklmnopqrstuvw[...29 chars]",
        numbered: false
    }, "requested some same char at limit of no left-collapse");
    
    var mod = lib.subst(alpha, 15, '*');
    t.deepEqual(crumpler.shortenDiff(mod, alpha, 36, 1), {
        subject:  "[14 chars...]o*qrstuvwx[...28 chars]",
        model: "[14 chars...]opqrstuvwx[...28 chars]",
        numbered: false
    }, "requested one same char at limit of left-collapse");

    mod = lib.subst(alpha, 51, '*');
    t.deepEqual(crumpler.shortenDiff(mod, alpha, 36, 0), {
        subject:  "[29 chars...]DEFGHIJKLMNOPQRSTUVWXY*",
        model: "[29 chars...]DEFGHIJKLMNOPQRSTUVWXYZ",
        numbered: false
    }, "requested no same chars but diff at right-most char");

    mod = lib.subst(alpha, 51, '*');
    t.deepEqual(crumpler.shortenDiff(mod, alpha, 36, 2), {
        subject:  "[29 chars...]DEFGHIJKLMNOPQRSTUVWXY*",
        model: "[29 chars...]DEFGHIJKLMNOPQRSTUVWXYZ",
        numbered: false
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
        subject:
            "[47 chars...]UVWXY*1\n"+
            "/abcdef[...47 chars]\n"+
            "-abcdef[...47 chars]\n",
        model:
            "[47 chars...]UVWXYZ1\n"+
            "/abcdef[...47 chars]\n"+
            "-abcdef[...47 chars]\n",
        numbered: false
    });
    
    wantedIn = "|"+ alpha +"1\n==\n/"+ alpha +"2\n==\n-"+ alpha +"3\n";
    foundIn = "|"+ alpha2 +"1\n==\n/"+ alpha2 +"2\n==\n-"+ alpha2 +"3\n";
    foundPair = crumpler.shortenDiff(foundIn, wantedIn, 20);
    lib.testDiffs(t, "multiple head-collapsed lines", foundPair, {
        subject:
            "[47 chars...]UVWXY*1\n==\n"+
            "[47 chars...]UVWXY*2\n==\n"+
            "[47 chars...]UVWXY*3\n",
        model:
            "[47 chars...]UVWXYZ1\n==\n"+
            "[47 chars...]UVWXYZ2\n==\n"+
            "[47 chars...]UVWXYZ3\n",
        numbered: false
    });

    alpha2 = lib.subst(alpha, 26, '*');
    wantedIn = "|"+ alpha +"1\n/"+ alpha +"2\n-"+ alpha +"3\n";
    foundIn = "|"+ alpha2 +"1\n/"+ alpha2 +"2\n-"+ alpha2 +"3\n";
    foundPair = crumpler.shortenDiff(foundIn, wantedIn, 34);
    lib.testDiffs(t, "head/tail-collapsed series of lines", foundPair, {
        subject:
            "[23 chars...]wxyz*BCD[...23 chars]\n"+
            "/abcdefghijklmnopqrst[...33 chars]\n"+
            "-abcdefghijklmnopqrst[...33 chars]\n",
        model:
            "[23 chars...]wxyzABCD[...23 chars]\n"+
            "/abcdefghijklmnopqrst[...33 chars]\n"+
            "-abcdefghijklmnopqrst[...33 chars]\n",
        numbered: false
    });
    
    wantedIn = "|"+ alpha +"1\n==\n/"+ alpha +"2\n==\n-"+ alpha +"3\n";
    foundIn = "|"+ alpha2 +"1\n==\n/"+ alpha2 +"2\n==\n-"+ alpha2 +"3\n";
    foundPair = crumpler.shortenDiff(foundIn, wantedIn, 34);
    lib.testDiffs(t, "multiple head/tail-collapsed lines", foundPair, {
        subject:
            "[23 chars...]wxyz*BCD[...23 chars]\n==\n"+
            "[23 chars...]wxyz*BCD[...23 chars]\n==\n"+
            "[23 chars...]wxyz*BCD[...23 chars]\n",
        model:
            "[23 chars...]wxyzABCD[...23 chars]\n==\n"+
            "[23 chars...]wxyzABCD[...23 chars]\n==\n"+
            "[23 chars...]wxyzABCD[...23 chars]\n",
        numbered: false
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
        subject:
            "1:[49 chars...]WXY*1\n"+
            "2:/abcd[...49 chars]\n"+
            "3:-abcd[...49 chars]\n",
        model:
            "1:[49 chars...]WXYZ1\n"+
            "2:/abcd[...49 chars]\n"+
            "3:-abcd[...49 chars]\n",
        numbered: true
    });
    
    wantedIn = "|"+ alpha +"1\n==\n/"+ alpha +"2\n==\n-"+ alpha +"3\n";
    foundIn = "|"+ alpha2 +"1\n==\n/"+ alpha2 +"2\n==\n-"+ alpha2 +"3\n";
    foundPair = crumpler.shortenDiff(foundIn, wantedIn, 20);
    lib.testDiffs(t, "multiple head-collapsed lines, numbered", foundPair, {
        subject:
            "1:[49 chars...]WXY*1\n2:==\n"+
            "3:[49 chars...]WXY*2\n4:==\n"+
            "5:[49 chars...]WXY*3\n",
        model:
            "1:[49 chars...]WXYZ1\n2:==\n"+
            "3:[49 chars...]WXYZ2\n4:==\n"+
            "5:[49 chars...]WXYZ3\n",
        numbered: true
    });

    alpha2 = lib.subst(alpha, 26, '*');
    wantedIn = "|"+ alpha +"1\n/"+ alpha +"2\n-"+ alpha +"3\n";
    foundIn = "|"+ alpha2 +"1\n/"+ alpha2 +"2\n-"+ alpha2 +"3\n";
    foundPair = crumpler.shortenDiff(foundIn, wantedIn, 34);
    lib.testDiffs(t, "head/tail-collapsed series of lines, numbered",
        foundPair, {
        subject:
            "1:[24 chars...]xyz*BC[...24 chars]\n"+
            "2:/abcdefghijklmnopqr[...35 chars]\n"+
            "3:-abcdefghijklmnopqr[...35 chars]\n",
        model:
            "1:[24 chars...]xyzABC[...24 chars]\n"+
            "2:/abcdefghijklmnopqr[...35 chars]\n"+
            "3:-abcdefghijklmnopqr[...35 chars]\n",
        numbered: true
    });
    
    wantedIn = "|"+ alpha +"1\n==\n/"+ alpha +"2\n==\n-"+ alpha +"3\n";
    foundIn = "|"+ alpha2 +"1\n==\n/"+ alpha2 +"2\n==\n-"+ alpha2 +"3\n";
    foundPair = crumpler.shortenDiff(foundIn, wantedIn, 34);
    lib.testDiffs(t, "multiple head/tail-collapsed lines, numbered",
        foundPair, {
        subject:
            "1:[24 chars...]xyz*BC[...24 chars]\n2:==\n"+
            "3:[24 chars...]xyz*BC[...24 chars]\n4:==\n"+
            "5:[24 chars...]xyz*BC[...24 chars]\n",
        model:
            "1:[24 chars...]xyzABC[...24 chars]\n2:==\n"+
            "3:[24 chars...]xyzABC[...24 chars]\n4:==\n"+
            "5:[24 chars...]xyzABC[...24 chars]\n",
        numbered: true
    });

    t.end();
});
