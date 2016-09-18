// This file both generates the expected tap output and tests against that
// output. To generate the output, enter this command:
//   subtap tests/t_asserts.js --targ=tests/temp
// Here tests/temp is a temporary directory. Examine the output to make sure
// it is what is expected. If correct, move the .tap files to tests/fixtures.

var fs = require('fs');
var path = require('path');
var MemoryStream = require('memory-streams').WritableStream;
var tap = require('tap');

var Crumpler = require('../');
var lib = require('./lib/library');

var dirPath = null;
if (process.argv.length > 2)
    dirPath = path.resolve(process.cwd(), process.argv[2]);
    
Crumpler.addAsserts(tap);
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

var moby1 = lib.loadFixture('moby_orig.txt'); // don't compare string w/ itself
var moby2 = lib.loadFixture('moby_orig.txt');
var mobyTweaked = moby1.replace("a grasshopper", "Phidippus mystaceus");
var description = "here ran an assertion";

tap.test("equality assertion extensions, numbered", function (t) {
    
    runAssertion(t, 'equal_same', function (t) {
        t.textEqual(moby1, moby2, crumpler, description);
    }, "textEqual(): identical text, numbered");
    
    runAssertion(t, 'equal_same', function (t) {
        t.textEquals(moby1, moby2, crumpler, description);
    }, "textEquals(): identical text, numbered");
    
    runAssertion(t, 'equal_diff', function (t) {
        t.textEqual(moby1, mobyTweaked, crumpler, description);
    }, "textEqual(): different text, numbered");
    
    runAssertion(t, 'equal_diff', function (t) {
        t.textEquals(moby1, mobyTweaked, crumpler, description);
    }, "textEquals(): different text, numbered");
    
    t.end();
});

tap.test("inequality assertion extensions, numbered", function (t) {
    
    runAssertion(t, 'inequal_same', function (t) {
        t.textInequal(moby1, moby2, crumpler, description);
    }, "textInequal(): identical text, numbered");
    
    runAssertion(t, 'inequal_same', function (t) {
        t.textNotEqual(moby1, moby2, crumpler, description);
    }, "textNotEqual(): identical text, numbered");
    
    runAssertion(t, 'inequal_diff', function (t) {
        t.textInequal(moby1, mobyTweaked, crumpler, description);
    }, "textInequal(): different text, numbered");
    
    runAssertion(t, 'inequal_diff', function (t) {
        t.textNotEqual(moby1, mobyTweaked, crumpler, description);
    }, "textNotEqual(): different text, numbered");
    
    t.end();
});

tap.test("assertion extensions, unnumbered", function (t) {
    crumpler = new Crumpler({
        normBracketSize: 1,
        diffBracketSize: 0,
        maxNormLineLength: 180,
        maxLineDiffLength: 180,
        sameHeadLengthLimit: 85,
        sameTailLengthLimit: 65,
        minNumberedLines: 0
    });
    
    runAssertion(t, 'equal_same_nonum', function (t) {
        t.textEqual(moby1, moby2, crumpler, description);
    }, "textEqual(): identical text, unnumbered");
    
    runAssertion(t, 'equal_diff_nonum', function (t) {
        t.textEqual(moby1, mobyTweaked, crumpler, description);
    }, "textEqual(): different text, unnumbered");
    
    runAssertion(t, 'inequal_same_nonum', function (t) {
        t.textInequal(moby1, moby2, crumpler, description);
    }, "textInequal(): identical text, unnumbered");
    
    runAssertion(t, 'inequal_diff_nonum', function (t) {
        t.textInequal(moby1, mobyTweaked, crumpler, description);
    }, "textInequal(): different text, unnumbered");
    
    t.end();
});

function normalizeTap(tapOutput) {
    var atIndex = tapOutput.indexOf("  at:\n");
    if (atIndex < 0)
        return tapOutput;
    return tapOutput.substr(0, atIndex);
}

function runAssertion(t, tapFilename, doAssertFunc, desc) {
    tapFilename = tapFilename + '.tap';
    if (dirPath !== null)
        saveTapOutput(doAssertFunc, path.resolve(dirPath, tapFilename));
    else
        testTapOutput(t, doAssertFunc, tapFilename, desc);
}

function saveTapOutput(doAssertFunc, filePath) {
    var tapOutput = toTapOutput(doAssertFunc);
    fs.writeFileSync(filePath, normalizeTap(tapOutput));
};

function testTapOutput(t, doAssertFunc, tapFilename, desc) {
    var wanted = lib.loadFixture(tapFilename);
    var found = normalizeTap(toTapOutput(doAssertFunc));
    t.equal(found, wanted, desc +" ("+ tapFilename +")");
}

function toTapOutput(doAssertFunc) {
    var t = new tap.Test();
    var s = new MemoryStream();
    t.pipe(s);
    doAssertFunc(t);
    return s.toString();
};
