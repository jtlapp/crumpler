var t = require('tap');
var Crumpler = require('../');
var lib = require('./lib/library');

var moby = lib.loadFixture('moby_orig.txt');

t.test("Moby Dick chapter 1", function (t) {
    var crumpler = new Crumpler({
        bracketSize: 2,
        lineNumberPadding: '0',
        indentCollapsedLines: false
    });
    var mobyShrunk = lib.loadFixture('moby_shrunk.txt');
    t.equal(crumpler.shortenText(moby, 200), mobyShrunk,
        "shrink chapter 1");

    crumpler = new Crumpler({
        bracketSize: 1,
        lineNumberPadding: '0',
        indentCollapsedLines: false
    });
    var mobyFixedUp = moby.replace("a grasshopper", "Phidippus mystaceus");
    var mobyWantedOut = lib.loadFixture('moby_wanted.txt');
    var mobyFoundOut = lib.loadFixture('moby_found.txt');
    foundPair = crumpler.shortenDiff(mobyFixedUp, moby, 200);
    lib.testDiffs(t, "multiple head/tail-collapsed lines, numbered",
        foundPair, { found: mobyFoundOut, wanted: mobyWantedOut });

    t.end();
});