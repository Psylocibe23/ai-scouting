"use strict";
function onOpen() {
    var ui = SpreadsheetApp.getUi();
    ui.createMenu('Startup Scouting AI')
        .addItem('Hello test', 'helloTest')
        .addToUi();
}
function helloTest() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    ss.toast('Hello from TypeScript + clasp setup!');
}
