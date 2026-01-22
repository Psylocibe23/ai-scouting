function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Startup Scouting AI')
    .addItem('Hello test', 'helloTest')
    .addToUi();
}

function helloTest() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.toast('Hello from TypeScript + clasp setup!');
}
