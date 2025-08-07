// Debug test for multiple books issue
const { test, expect } = require('@playwright/test');
const { TestUtils } = require('./tests/setup');

test('debug multiple books creation', async ({ page }) => {
  const testUtils = new TestUtils(page);
  
  // Navigate to app first, then clear storage
  await page.goto('/');
  
  try {
    await page.evaluate(() => localStorage.clear());
  } catch (error) {
    console.warn('Could not clear localStorage:', error.message);
  }
  
  await page.waitForFunction(() => window.app !== undefined);

  // Create first book
  console.log('Creating first book...');
  await testUtils.createBookWithContent('Book 1', 'Chapter 1', 'Content 1');
  await testUtils.click('#backToListBtn');
  
  let bookCount = await testUtils.getBookCount();
  console.log(`After first book: ${bookCount} books`);
  let bookList = await page.locator('.book-item').count();
  console.log(`Visible book items: ${bookList}`);
  
  // Create second book
  console.log('Creating second book...');
  await testUtils.createBookWithContent('Book 2', 'Chapter 1', 'Content 2');
  await testUtils.click('#backToListBtn');
  
  bookCount = await testUtils.getBookCount();
  console.log(`After second book: ${bookCount} books`);
  bookList = await page.locator('.book-item').count();
  console.log(`Visible book items: ${bookList}`);

  // Create third book
  console.log('Creating third book...');
  await testUtils.createBookWithContent('Book 3', 'Chapter 1', 'Content 3');
  await testUtils.click('#backToListBtn');
  
  bookCount = await testUtils.getBookCount();
  console.log(`After third book: ${bookCount} books`);
  bookList = await page.locator('.book-item').count();
  console.log(`Visible book items: ${bookList}`);

  // Debug storage
  const books = await page.evaluate(() => Object.values(window.app.books));
  console.log('Books in storage:', books.map(b => ({ id: b.id, title: b.title })));
  
  expect(bookCount).toBe(3);
});
