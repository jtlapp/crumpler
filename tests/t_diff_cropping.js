var t = require('tap');
var Crumpler = require('../');
var lib = require('./lib/library');
var util = require('util');

var alpha = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"; // 52

t.test("too few same characters to crop", function (t) {
    var crumpler = new Crumpler({
        minNumberedLines: 0,
        sameHeadLengthLimit: 3,
        sameTailLengthLimit: 3,
        maxLineDiffLength: 3 // all diffs here <= 3
    });
    var minHead = 'H'.repeat(lib.headEllipsis(10).length - 1);
    var minTail = 'T'.repeat(lib.tailEllipsis(10).length - 1);
    
    var wantedIn = minHead +"abcdef"+ minTail;
    var foundIn =  minHead +"abc123def"+ minTail;
    foundPair = crumpler.shortenDiff(foundIn, wantedIn);
    lib.testDiffs(t, "head/tail under same limit, found more", foundPair, {
        model: wantedIn,
        subject: foundIn
    });

    wantedIn = minHead +"abc123def"+ minTail;
    foundIn =  minHead +"abcdef"+ minTail;
    foundPair = crumpler.shortenDiff(foundIn, wantedIn);
    lib.testDiffs(t, "head/tail under same limit, found less", foundPair, {
        model: wantedIn,
        subject: foundIn
    });

    minHead = 'H'.repeat(lib.headEllipsis(10).length);
    minTail = 'T'.repeat(lib.tailEllipsis(10).length);
    
    wantedIn = minHead +"abcdef"+ minTail;
    foundIn =  minHead +"abc123def"+ minTail;
    foundPair = crumpler.shortenDiff(foundIn, wantedIn);
    lib.testDiffs(t, "head/tail at same limit, found more", foundPair, {
        model: wantedIn,
        subject: foundIn
    });

    wantedIn = minHead +"abc123def"+ minTail;
    foundIn =  minHead +"abcdef"+ minTail;
    foundPair = crumpler.shortenDiff(foundIn, wantedIn);
    lib.testDiffs(t, "head/tail at same limit, found less", foundPair, {
        model: wantedIn,
        subject: foundIn
    });

    t.end();
});

t.test("over same-character cropping limits", function (t) {
    var crumpler = new Crumpler({
        minNumberedLines: 0,
        sameHeadLengthLimit: 3,
        sameTailLengthLimit: 3,
        maxLineDiffLength: 3 // all diffs here <= 3
    });
    var skipLength = 14;
    var head = 'H'.repeat(skipLength);
    var tail = 'T'.repeat(skipLength);
    var headCrop = lib.headEllipsis(skipLength);
    var tailCrop = lib.tailEllipsis(skipLength);
    
    var wantedIn = head +"abcde"+ tail;
    var foundIn =  head +"abc123de"+ tail;
    foundPair = crumpler.shortenDiff(foundIn, wantedIn);
    lib.testDiffs(t, "head over same limit, found more", foundPair, {
        model: headCrop +"abcde"+ tail,
        subject: headCrop +"abc123de"+ tail
    });

    wantedIn = head +"abc123de"+ tail;
    foundIn =  head +"abcde"+ tail;
    foundPair = crumpler.shortenDiff(foundIn, wantedIn);
    lib.testDiffs(t, "head over same limit, found less", foundPair, {
        model: headCrop +"abc123de"+ tail,
        subject: headCrop +"abcde"+ tail
    });

    wantedIn = head +"bcdef"+ tail;
    foundIn =  head +"bc123def"+ tail;
    foundPair = crumpler.shortenDiff(foundIn, wantedIn);
    lib.testDiffs(t, "tail over same limit, found more", foundPair, {
        model: head +"bcdef"+ tailCrop,
        subject: head +"bc123def"+ tailCrop
    });

    wantedIn = head +"bc123def"+ tail;
    foundIn =  head +"bcdef"+ tail;
    foundPair = crumpler.shortenDiff(foundIn, wantedIn);
    lib.testDiffs(t, "tail over same limit, found less", foundPair, {
        model: head +"bc123def"+ tailCrop,
        subject: head +"bcdef"+ tailCrop
    });

    wantedIn = head +"abcdef"+ tail;
    foundIn =  head +"abc123def"+ tail;
    foundPair = crumpler.shortenDiff(foundIn, wantedIn);
    lib.testDiffs(t, "head/tail over same limit, found more", foundPair, {
        model: headCrop +"abcdef"+ tailCrop,
        subject: headCrop +"abc123def"+ tailCrop
    });

    wantedIn = head +"abc123def"+ tail;
    foundIn =  head +"abcdef"+ tail;
    foundPair = crumpler.shortenDiff(foundIn, wantedIn);
    lib.testDiffs(t, "head/tail over same limit, found less", foundPair, {
        model: headCrop +"abc123def"+ tailCrop,
        subject: headCrop +"abcdef"+ tailCrop
    });

    t.end();
});

t.test("custom same head/tail cropping ellipses", function (t) {
    var crumpler = new Crumpler({
        minNumberedLines: 0,
        sameHeadLengthLimit: 3,
        sameTailLengthLimit: 3,
        headCropEllipsis: "{n}...",
        tailCropEllipsis: "...{n}"
    });
    var skipLength = 5; // >= length of ellipsis + 1
    var head = 'H'.repeat(skipLength);
    var tail = 'T'.repeat(skipLength);
    var headCrop = "5...";
    var tailCrop = "...5";
    
    var wantedIn = head +"abcXYZde"+ tail;
    var foundIn =  head +"abc123de"+ tail;
    foundPair = crumpler.shortenDiff(foundIn, wantedIn);
    lib.testDiffs(t, "head over same limit, custom ellipsis w/ count", foundPair, {
        model: headCrop +"abcXYZde"+ tail,
        subject: headCrop +"abc123de"+ tail
    });

    wantedIn = head +"bcXYZdef"+ tail;
    foundIn =  head +"bc123def"+ tail;
    foundPair = crumpler.shortenDiff(foundIn, wantedIn);
    lib.testDiffs(t, "tail over same limit, custom ellipsis w/ count", foundPair, {
        model: head +"bcXYZdef"+ tailCrop,
        subject: head +"bc123def"+ tailCrop
    });

    crumpler = new Crumpler({
        minNumberedLines: 0,
        sameHeadLengthLimit: 3,
        sameTailLengthLimit: 3,
        headCropEllipsis: "...",
        tailCropEllipsis: "..."
    });
    skipLength = 4; // >= length of ellipsis + 1
    head = 'H'.repeat(skipLength);
    tail = 'T'.repeat(skipLength);
    headCrop = "...";
    tailCrop = "...";
    
    wantedIn = head +"abcXYZde"+ tail;
    foundIn =  head +"abc123de"+ tail;
    foundPair = crumpler.shortenDiff(foundIn, wantedIn);
    lib.testDiffs(t, "head over same limit, custom ellipsis w/out count", foundPair, {
        model: headCrop +"abcXYZde"+ tail,
        subject: headCrop +"abc123de"+ tail
    });

    wantedIn = head +"bcXYZdef"+ tail;
    foundIn =  head +"bc123def"+ tail;
    foundPair = crumpler.shortenDiff(foundIn, wantedIn);
    lib.testDiffs(t, "tail over same limit, custom ellipsis w/out count", foundPair, {
        model: head +"bcXYZdef"+ tailCrop,
        subject: head +"bc123def"+ tailCrop
    });

    t.end();
});

t.test("tail-cropping for max diff length", function (t) {
    var crumpler = new Crumpler({
        minNumberedLines: 0,
        maxLineDiffLength: 3
    });
    var minSkipLength = 14;
    var head = 'H'.repeat(minSkipLength - 3);
    var tail = 'T'.repeat(minSkipLength - 3);
    var headCrop = lib.headEllipsis(minSkipLength);
    var tailCrop = lib.tailEllipsis(minSkipLength);
    
    var wantedIn = "ab"+ tail;
    var foundIn =  "1234"+ tail; // would crop 12 chars
    foundPair = crumpler.shortenDiff(foundIn, wantedIn);
    lib.testDiffs(t, "under tail-crop limit, found more", foundPair, {
        model: wantedIn,
        subject: foundIn
    });
    
    wantedIn = "abcd"+ tail; // would crop 12 chars
    foundIn =  "12"+ tail;
    foundPair = crumpler.shortenDiff(foundIn, wantedIn);
    lib.testDiffs(t, "under tail-crop limit, found less", foundPair, {
        model: wantedIn,
        subject: foundIn
    });
    
    wantedIn = "abT"+ tail;
    foundIn =  "1234T"+ tail; // would crop 13 chars
    foundPair = crumpler.shortenDiff(foundIn, wantedIn);
    lib.testDiffs(t, "at tail no-crop limit, found more", foundPair, {
        model: wantedIn,
        subject: foundIn
    });
    
    wantedIn = "abcdT"+ tail; // would crop 13 chars
    foundIn =  "12T"+ tail;
    foundPair = crumpler.shortenDiff(foundIn, wantedIn);
    lib.testDiffs(t, "at tail no-crop limit, found less", foundPair, {
        model: wantedIn,
        subject: foundIn
    });
    
    wantedIn = "abTT"+ tail;
    foundIn =  "1234TT"+ tail; // crops 14 chars
    foundPair = crumpler.shortenDiff(foundIn, wantedIn);
    lib.testDiffs(t, "over tail-crop limit, found more", foundPair, {
        model: wantedIn,
        subject: "123"+ tailCrop
    });

    wantedIn = "abcdTT"+ tail; // crops 14 chars
    foundIn =  "12TT"+ tail;
    foundPair = crumpler.shortenDiff(foundIn, wantedIn);
    lib.testDiffs(t, "over tail-crop limit, found less", foundPair, {
        model: "abc"+ tailCrop,
        subject: foundIn
    });

    wantedIn = "abcdTT"+ tail; // crops 14 chars
    foundIn =  "1234TT"+ tail;
    foundPair = crumpler.shortenDiff(foundIn, wantedIn);
    lib.testDiffs(t, "both over tail-crop limit, found less", foundPair, {
        model: "abc"+ tailCrop,
        subject: "123"+ tailCrop
    });

    t.end();
});

t.test("interactions of maxLineDiffLength with same-limits", function (t) {
    var crumpler = new Crumpler({
        minNumberedLines: 0,
        sameTailLengthLimit: 30,
        maxLineDiffLength: 3
    });
    var skipLength = 14;
    var head = 'H'.repeat(skipLength - 1);
    var tail = 'T'.repeat(skipLength - 1);
    var headCrop = lib.headEllipsis(skipLength);
    var tailCrop = lib.tailEllipsis(skipLength);
    
    var wantedIn = "abcd"+ tail; // crops 14 chars
    var foundIn =  "1234"+ tail;
    lib.testDiffs(t, "tail-crop despite long enough sameTailLengthLimit",
        crumpler.shortenDiff(foundIn, wantedIn), {
            model: "abc"+ tailCrop,
            subject: "123"+ tailCrop
        }
    );

    crumpler = new Crumpler({
        minNumberedLines: 0,
        sameHeadLengthLimit: 3,
        sameTailLengthLimit: 3,
        maxLineDiffLength: 3
    });
    lib.testDiffs(t, "tail-crop despite sameTailLengthLimit that would make line too short",
        crumpler.shortenDiff(foundIn, wantedIn), {
            model: "abc"+ tailCrop,
            subject: "123"+ tailCrop
        }
    );
    
    wantedIn = head +"Hxxxabc"+ tail; // crops 14 chars
    foundIn =  head +"Hxxx1234"+ tail;
    lib.testDiffs(t, "head-cropping with maxLineDiffLength tail cropping",
        crumpler.shortenDiff(foundIn, wantedIn), {
            model: headCrop +"xxxabc"+ tail,
            subject: headCrop +"xxx123"+ tailCrop
        }
    );

    t.end();
});

t.test("cropping multi-line differences", function (t) {
    var crumpler = new Crumpler({
        minNumberedLines: 0,
        sameHeadLengthLimit: 3,
        sameTailLengthLimit: 3,
        maxLineDiffLength: 3 
    });
    var skipLength = 14;
    var head = 'H'.repeat(skipLength);
    var tail = 'T'.repeat(skipLength);
    var headCrop = lib.headEllipsis(skipLength);
    var tailCrop = lib.tailEllipsis(skipLength);
    var minCropLength = 3 + skipLength;
    var short1 = 'a'.repeat(minCropLength - 1) +"\n";
    var short2 = 'b'.repeat(minCropLength - 2) +"\n";
    var short3 = 'c'.repeat(minCropLength - 3) +"\n";
    var short4 = 'd'.repeat(minCropLength - 1) +"\n";
    var long1 = 'A'.repeat(minCropLength) +"\n";
    var long2 = 'B'.repeat(minCropLength + 1) +"\n";
    var long3 = 'C'.repeat(minCropLength) +"\n";
    var long4 = 'D'.repeat(minCropLength + 1) +"\n";
    
    wantedIn = "xyz\n"+ long1 + long2 +"pdq\n";
    foundIn =  "xyz\n"+ long3 + long4 +"pdq\n";
    lib.testDiffs(t, "all diff lines cropped at maxLineDiffLength",
        crumpler.shortenDiff(foundIn, wantedIn), {
        model: "xyz\nAAA"+ lib.tailEllipsis(14) +"\n"+
                "BBB"+ lib.tailEllipsis(15) +"\npdq\n",
        subject: "xyz\nCCC"+ lib.tailEllipsis(14) +"\n"+
                "DDD"+ lib.tailEllipsis(15) +"\npdq\n"
    });

    wantedIn = "xyz\n00"+ long1 +"00"+ long2 +"pdq\n";
    foundIn =  "xyz\n00"+ long3 +"00"+ long4 +"pdq\n";
    lib.testDiffs(t, "cropping at maxLineDiffLength with common line starts",
        crumpler.shortenDiff(foundIn, wantedIn), {
        model: "xyz\n00AAA"+ lib.tailEllipsis(14) +"\n"+
                "00B"+ lib.tailEllipsis(17) +"\npdq\n",
        subject: "xyz\n00CCC"+ lib.tailEllipsis(14) +"\n"+
                "00D"+ lib.tailEllipsis(17) +"\npdq\n"
    });

    wantedIn = long1 + short1 + long2 + short2;
    foundIn =  long3 + short3 + long4 + short4;
    lib.testDiffs(t, "cropping 1st line, some diff lines for maxLineDiffLength",
        crumpler.shortenDiff(foundIn, wantedIn), {
        model: "AAA"+ lib.tailEllipsis(14) +"\n"+
                short1+
                "BBB"+ lib.tailEllipsis(15) +"\n"+
                short2,
        subject: "CCC"+ lib.tailEllipsis(14) +"\n"+
                short3+
                "DDD"+ lib.tailEllipsis(15) +"\n"+
                short4
    });

    wantedIn = short2 + long1 + short1 + long2;
    foundIn =  short4 + long3 + short3 + long4;
    lib.testDiffs(t, "no-crop 1st line, only diff lines for maxLineDiffLength",
        crumpler.shortenDiff(foundIn, wantedIn), {
        model: short2+
                "AAA"+ lib.tailEllipsis(14) +"\n"+
                short1+
                "BBB"+ lib.tailEllipsis(15) +"\n",
        subject: short4+
                "CCC"+ lib.tailEllipsis(14) +"\n"+
                short3+
                "DDD"+ lib.tailEllipsis(15) +"\n"
    });

    wantedIn = head +"abc123def"+ tail +"\n"+ head + long1;
    foundIn =  head +"abcdef"+ tail +"\n"+ head + long2;
    foundPair = crumpler.shortenDiff(foundIn, wantedIn);
    lib.testDiffs(t, "head/tail cropping of only 1st diff line", foundPair, {
        model: headCrop +"abc123def"+ tailCrop +"\n"+
                "HHH"+ lib.tailEllipsis(String(head + long1).length - 4) +"\n",
        subject: headCrop +"abcdef"+ tailCrop +"\n"+
                "HHH"+ lib.tailEllipsis(String(head + long2).length - 4) +"\n"
    });

    crumpler = new Crumpler({
        minNumberedLines: 0,
        maxNormLineLength: 2,
        maxLineDiffLength: 3 
    });
    wantedIn = long1 + long2 + long4;
    foundIn =  long1 + long3 + long4;
    lib.testDiffs(t, "limit some for maxLineDiffLength, some for maxNormLineLength",
        crumpler.shortenDiff(foundIn, wantedIn), {
        model: "AA"+ lib.tailEllipsis(15) +"\n"+
                "BBB"+ lib.tailEllipsis(15) +"\n"+
                "DD"+ lib.tailEllipsis(16) +"\n",
        subject: "AA"+ lib.tailEllipsis(15) +"\n"+
                "CCC"+ lib.tailEllipsis(14) +"\n"+
                "DD"+ lib.tailEllipsis(16) +"\n"
    });

    t.end();
});
