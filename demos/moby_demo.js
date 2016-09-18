var t = require('tap');
var Crumpler = require('../');
var lib = require('../tests/lib/library');

Crumpler.addAsserts(t);
var crumpler = new Crumpler({
    normBracketSize: 1,
    diffBracketSize: 0,
    maxNormLineLength: 180,
    maxLineDiffLength: 180,
    sameHeadLengthLimit: 85,
    sameTailLengthLimit: 65,
    lineNumberPadding: '0'
});

var mobyChapter1 = lib.loadFixture('moby_orig.txt');
var mobyFixedUp = mobyChapter1.replace("a grasshopper", "Phidippus mystaceus");

t.textEqual(mobyChapter1, mobyFixedUp, crumpler);
