"use strict";
function testCheerio() {
    var action = 'testCheerio';
    try {
        var url = 'https://en.wikipedia.org/wiki/Startup_accelerator';
        var html = UrlFetchApp.fetch(url).getContentText();
        var $ = Cheerio.load(html);
        // Simple selectors
        var pageTitle = $('title').first().text().trim();
        var h1 = $('h1').first().text().trim();
        Logger.log("[".concat(action, "] title: ").concat(pageTitle));
        Logger.log("[".concat(action, "] h1: ").concat(h1));
    }
    catch (e) {
        Logger.log("[".concat(action, "] Error: ").concat(e));
    }
}
