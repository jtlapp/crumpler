var tap = require('tap');
var fs = require('fs');
var path = require('path');
var Crumpler = require('../');

var crumpler = new Crumpler({
    minNumberedLines: 0
});

var simpleLinesPath = path.resolve(__dirname, './fixtures/simple_lines.txt');
var simpleLines = fs.readFileSync(simpleLinesPath, 'utf8');

tap.test("shorten text", function (t) {
    t.equal(crumpler.shortenText(simpleLines),
        "First line.\nSecond line.\nThird line.\n  ...\n"+
        "Eighth line.\nNineth line.\nTenth line.");
    t.end();
});