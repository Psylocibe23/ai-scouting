function testCheerio(): void {
  const action = 'testCheerio';

  try {
    const url = 'https://en.wikipedia.org/wiki/Startup_accelerator';
    const html = UrlFetchApp.fetch(url).getContentText();

    const $ = Cheerio.load(html);

    // Simple selectors
    const pageTitle = $('title').first().text().trim();
    const h1 = $('h1').first().text().trim();

    Logger.log(`[${action}] title: ${pageTitle}`);
    Logger.log(`[${action}] h1: ${h1}`);
  } catch (e) {
    Logger.log(`[${action}] Error: ${e}`);
  }
}
