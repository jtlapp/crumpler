var t = require('tap');
var Crumpler = require('../');
var lib = require('./lib/library');

var tenLines = lib.loadFixture('ten_lines.txt');
var LF = "\n";
var ALPHANUM = "abcdefghijklmnopqrstuvwxyz0123456789";
var crumpler = new Crumpler();

t.test("collapse a single line", function (t) {
    var alphanum3 = ALPHANUM + ALPHANUM + ALPHANUM;
    
    t.equal(crumpler.shortenLines(alphanum3), alphanum3,
        "shortenLines: unshortened unlimited line");
    t.equal(crumpler.shortenText(alphanum3), alphanum3,
        "shortenText: unshortened unlimited line");
    
    t.equal(crumpler.shortenLines(alphanum3, 300), alphanum3,
        "shortenLines: unshortened high-capacity line");
    t.equal(crumpler.shortenText(alphanum3, 300), alphanum3,
        "shortenText: unshortened high-capacity line");
    
    var tail = lib.endLine(72);
    t.equal(crumpler.shortenLines(alphanum3, 36 + tail.length),
        ALPHANUM + tail,
        "shortenLines: shortened tail");
    t.equal(crumpler.shortenText(alphanum3, 36 + tail.length),
        ALPHANUM + tail,
        "shortenText: shortened tail");
    
    tail = lib.endLine(33);
    t.equal(crumpler.shortenLines(ALPHANUM + LF, 3 + tail.length),
        "abc" + tail + LF,
        "shortenLines: shortened tail with LF");
    t.equal(crumpler.shortenText(ALPHANUM + LF, 3 + tail.length),
        "abc" + tail + LF,
        "shortenText: shortened tail with LF");
        
    t.end();
});

t.test("collapse multiple lines", function (t) {
    var crumpler = new Crumpler({
        minNumberedLines: 0
    });
    
    var multilines = ALPHANUM +"\n|"+ ALPHANUM +"\nabc\n/" + ALPHANUM;
    var tail1 = lib.endLine(33);
    var tail2 = lib.endLine(34);
    var wanted = 
        "abc" + tail1 +
        "\n|ab" + tail2 +
        "\nabc" +
        "\n/ab" + tail2;
    t.equal(crumpler.shortenLines(multilines, 3 + tail1.length), wanted,
        "shortenLines: outer lines shortened");
    t.equal(crumpler.shortenText(multilines, 3 + tail1.length), wanted,
        "shortenText: outer lines shortened");
        
    multilines = "abc\n"+ ALPHANUM +"\n"+ ALPHANUM +"\nabc";
    var wanted = 
        "abc" +
        "\nabc" + tail1 +
        "\nabc" + tail1 +
        "\nabc";
    t.equal(crumpler.shortenLines(multilines, 3 + tail1.length), wanted,
        "shortenLines: inner lines shortened");
    t.equal(crumpler.shortenText(multilines, 3 + tail1.length), wanted,
        "shortenText: inner lines shortened");
        
    t.end();
});

t.test("line end collapsing limits", function (t) {
    var crumpler = new Crumpler({
        minNumberedLines: 0
    });
    
    var tail = lib.endLine(99); // two digits
    var text = "*".repeat(tail.length - 1);
    t.equal(crumpler.shortenLines(text, tail.length), text,
        "fewer chars than a collapse");
    
    text = "*".repeat(tail.length);
    t.equal(crumpler.shortenLines(text, tail.length), text,
        "as many chars as a collapse");
    
    text = "*".repeat(tail.length + 1);
    t.equal(crumpler.shortenLines(text, tail.length),
        lib.endLine(14),
        "one more char than collapse length");
    
    text = "*".repeat(tail.length + 1);
    t.equal(crumpler.shortenLines(text, tail.length - 1),
        lib.endLine(14),
        "text longer than collapse, collapse longer than max length");

    // when both collapse and text are longer than max line length,
    // show the collapse because it may have a line count that would
    // inform the user that their minimum line length is too small.
     
    text = "*".repeat(tail.length);
    t.equal(crumpler.shortenLines(text, tail.length - 1),
        lib.endLine(13),
        "text as long as collapse but longer than max length");

    text = "*".repeat(tail.length - 1);
    t.equal(crumpler.shortenLines(text, tail.length - 2),
        lib.endLine(12),
        "collapse longer than text, text longer than max length");

    t.end();
});

t.test("no-count line-end collapse text", function (t) {
    var tail = "...BlahBlahBlah";
    var crumpler = new Crumpler({
        minNumberedLines: 0,
        tailCropEllipsis: tail
    });
    
    t.equal(crumpler.shortenLines(ALPHANUM, 3 + tail.length), "abc" + tail,
        "no-count line-end collapse");
        
    var text = "*".repeat(tail.length - 1);
    t.equal(crumpler.shortenLines(text, tail.length), text,
        "fewer chars than a no-count collapse");
    
    text = "*".repeat(tail.length);
    t.equal(crumpler.shortenLines(text, tail.length), text,
        "as many chars as a no-count collapse");
    
    text = "*".repeat(tail.length + 1);
    t.equal(crumpler.shortenLines(text, tail.length), tail,
        "one more char than no-count collapse length");
    
    text = "*".repeat(tail.length + 1);
    t.equal(crumpler.shortenLines(text, tail.length - 1), tail,
        "text longer than no-count collapse, collapse longer than max length");

    // when both collapse and text are longer than max line length,
    // show the collapse because it may have a line count that would
    // inform the user that their minimum line length is too small.
     
    text = "*".repeat(tail.length);
    t.equal(crumpler.shortenLines(text, tail.length - 1), tail,
        "text as long as no-count collapse but longer than max length");

    text = "*".repeat(tail.length - 1);
    t.equal(crumpler.shortenLines(text, tail.length - 2), tail,
        "no-count collapse longer than text, text longer than max length");

    t.end();
});

t.test("empty line-end collapse text", function (t) {
    var crumpler = new Crumpler({
        minNumberedLines: 0,
        tailCropEllipsis: ''
    });
    
    t.equal(crumpler.shortenLines(ALPHANUM, 3), "abc",
        "empty line-end collapse");

    t.end();
});
