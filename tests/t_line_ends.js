var t = require('tap');
var Crumpler = require('../');
var lib = require('./lib/library');

var tenLines = lib.loadFixture('ten_lines.txt');
var LF = "\n";
var ALPHANUM = "abcdefghijklmnopqrstuvwxyz0123456789";

t.test("empty lines", function (t) {
    var crumpler = new Crumpler({
        normBracketSize: 0,
        minNumberedLines: 0
    });    
    t.equal(crumpler.shortenText(''), '',
        "empty line with no line length limit");

    crumpler = new Crumpler({
        normBracketSize: 0,
        minNumberedLines: 0,
        maxNormLineLength: 1
    });
    t.equal(crumpler.shortenText(''), '',
        "empty line with line length limit");

    t.end(); 
});

t.test("tail-crop a single line", function (t) {
    var crumpler = new Crumpler({
        normBracketSize: 0
    });    
    var alphanum3 = ALPHANUM + ALPHANUM + ALPHANUM;
    
    t.equal(crumpler.shortenText(alphanum3), alphanum3,
        "unshortened unlimited line");
    
    t.equal(crumpler.shortenText(alphanum3, 300), alphanum3,
        "unshortened high-capacity line");
    
    var tail = lib.tailEllipsis(72);
    t.equal(crumpler.shortenText(alphanum3, 36),
        ALPHANUM + tail,
        "shortened tail");
    
    tail = lib.tailEllipsis(33);
    t.equal(crumpler.shortenText(ALPHANUM + LF, 3),
        "abc" + tail + LF,
        "shortened tail with LF");
        
    t.end();
});

t.test("tail-crop multiple lines", function (t) {
    var crumpler1 = new Crumpler({
        normBracketSize: 0,
        minNumberedLines: 0
    });
    var crumpler2 = new Crumpler({
        minNumberedLines: 0
    });
    
    var multilines = ALPHANUM +"\n|"+ ALPHANUM +"\nabc\n/" + ALPHANUM;
    var tail1 = lib.tailEllipsis(33);
    var tail2 = lib.tailEllipsis(34);
    var wanted = 
        "abc" + tail1 +
        "\n|ab" + tail2 +
        "\nabc" +
        "\n/ab" + tail2;
    t.equal(crumpler1.shortenText(multilines, 3), wanted,
        "outer lines shortened, bracketing disabled");
    t.equal(crumpler2.shortenText(multilines, 3), wanted,
        "outer lines shortened, bracketing enabled");
        
    multilines = "abc\n"+ ALPHANUM +"\n"+ ALPHANUM +"\nabc";
    var wanted = 
        "abc" +
        "\nabc" + tail1 +
        "\nabc" + tail1 +
        "\nabc";
    t.equal(crumpler1.shortenText(multilines, 3), wanted,
        "inner lines shortened, bracketing disabled");
    t.equal(crumpler2.shortenText(multilines, 3), wanted,
        "inner lines shortened, bracketing enabled");
        
    t.end();
});

t.test("tail-cropping limits", function (t) {
    var crumpler = new Crumpler({
        minNumberedLines: 0
    });
    
    var tail = lib.tailEllipsis(99); // two digits
    var text = "*".repeat(tail.length + 2);
    t.equal(crumpler.shortenText(text, text.length - tail.length + 1), text,
        "fewer chars remaining than crop ellipsis length");
    
    t.equal(crumpler.shortenText(text, text.length - tail.length), text,
        "as many chars remaining than crop ellipsis length");
    
    t.equal(crumpler.shortenText(text, text.length - tail.length - 1),
        '*'+ lib.tailEllipsis(text.length - 1),
        "one more char remaining than crop ellipsis length");
    
    var crumpler = new Crumpler({
        minNumberedLines: 0,
        tailCropEllipsis: '...'
    });
    t.equal(crumpler.shortenText(ALPHANUM, 3), "abc...",
        "no-count tail ellipsis, with plenty of room for it");
    t.equal(crumpler.shortenText(ALPHANUM, 32),
        ALPHANUM.substr(0,32) +"...",
        "no-count tail ellipsis, with room for it + 1");
    t.equal(crumpler.shortenText(ALPHANUM, 33),
        ALPHANUM,
        "no-count tail ellipsis, with exactly room for it");
    t.equal(crumpler.shortenText(ALPHANUM, 34),
        ALPHANUM,
        "no-count tail ellipsis, with too-little room for it");

    var crumpler = new Crumpler({
        minNumberedLines: 0,
        tailCropEllipsis: '...{n}'
    });
    t.equal(crumpler.shortenText(ALPHANUM, 3), "abc...33",
        "tail ellipsis w/ count, with plenty of room for it");
    t.equal(crumpler.shortenText(ALPHANUM, 31),
        ALPHANUM.substr(0,31) +"...5",
        "tail ellipsis w/ count, with room for it + 1");
    t.equal(crumpler.shortenText(ALPHANUM, 32),
        ALPHANUM,
        "tail ellipsis w/ count, with exactly room for it");
    t.equal(crumpler.shortenText(ALPHANUM, 33),
        ALPHANUM,
        "tail ellipsis w/ count, with too-little room for it");
        
    t.end();
});

t.test("tail-crop ellipsis length gets bumped", function (t) {
    var crumpler = new Crumpler({
        minNumberedLines: 0,
        tailCropEllipsis: '+..**..**{n}' // 9 + 1 = 10 ==> 9 + 2 = 11
    });
    t.equal(crumpler.shortenText(ALPHANUM, 3), "abc+..**..**33",
        "min length gets bumped, with plenty of room for it");
    t.equal(crumpler.shortenText(ALPHANUM, 24),
        ALPHANUM.substr(0,24) +"+..**..**12",
        "min length gets bumped, with room for it + 1");
    t.equal(crumpler.shortenText(ALPHANUM, 25),
        ALPHANUM,
        "min length gets bumped, with exactly room for it");
    t.equal(crumpler.shortenText(ALPHANUM, 26),
        ALPHANUM,
        "min length gets bumped, with too-little room for it");

    crumpler = new Crumpler({
        minNumberedLines: 0,
        tailCropEllipsis: '..**..**{n}' // 9 chars for n <= 9, 10 for n >= 10
    });
    t.equal(crumpler.shortenText(ALPHANUM, 3), "abc..**..**33",
        "bumped upon insertion, with plenty of room for it");
    t.equal(crumpler.shortenText(ALPHANUM, 25),
        ALPHANUM.substr(0,25) +"..**..**11",
        "bumped upon insertion, with room for it + 1");
    t.equal(crumpler.shortenText(ALPHANUM, 26),
        ALPHANUM,
        "bumped upon insertion, with exactly room for it");
    t.equal(crumpler.shortenText(ALPHANUM, 27),
        ALPHANUM,
        "bumped upon insertion, with too-little room for it");

    t.end();
});

t.test("empty tail-crop ellipsis", function (t) {
    var crumpler = new Crumpler({
        minNumberedLines: 0,
        tailCropEllipsis: ''
    });
    
    t.equal(crumpler.shortenText(ALPHANUM, 3), "abc",
        "empty tail ellipsis, plenty of remainder");

    t.equal(crumpler.shortenText(ALPHANUM, 35),
        ALPHANUM.substr(0,35),
        "empty tail ellipsis, 1 char remainder");

    t.equal(crumpler.shortenText(ALPHANUM, 36),
        ALPHANUM,
        "empty tail ellipsis, no remainder");

    t.end();
});
