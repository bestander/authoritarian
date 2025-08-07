// Basic functionality tests
const { test, expect } = require('@playwright/test');
const { TestUtils } = require('./setup');

test.describe('Basic Functionality', () => {
  let testUtils;

  test.beforeEach(async ({ page }) => {
    testUtils = new TestUtils(page);
    
    // Navigate to app first, then clear storage
    await testUtils.page.goto('/');
    
    try {
      await testUtils.page.evaluate(() => localStorage.clear());
    } catch (error) {
      console.warn('Could not clear localStorage:', error.message);
    }
    
    await testUtils.page.waitForFunction(() => window.app !== undefined);
  });
  
  test('should show empty state initially', async () => {
    await testUtils.expectVisible('#emptyState');
    await testUtils.expectText('#emptyState h3', 'No books yet');
    await testUtils.expectCount('.book-item', 0);
  });

  test('should create new book', async () => {
    await testUtils.click('#newBookBtn');
    
    await testUtils.expectHidden('#bookList');
    await testUtils.expectVisible('#editor');
    await testUtils.expectValue('#bookTitleEditor', '');
    await testUtils.expectCount('.chapter', 1);
    
    const book = await testUtils.getCurrentBook();
    expect(book).toBeTruthy();
    expect(book.id).toBeTruthy();
    expect(book.chapters).toHaveLength(1);
  });

  test('should edit book title', async () => {
    await testUtils.createBookWithContent('Test Title', 'Chapter', 'Content');
    
    await testUtils.expectValue('#bookTitleEditor', 'Test Title');
    
    const book = await testUtils.getCurrentBook();
    expect(book.title).toBe('Test Title');
  });

  test('should navigate back to book list', async () => {
    await testUtils.click('#newBookBtn');
    await testUtils.expectVisible('#editor');
    
    await testUtils.click('#backToListBtn');
    await testUtils.expectVisible('#bookList');
    await testUtils.expectHidden('#editor');
  });

  test('should show auto-backup status', async ({ page }) => {
    await testUtils.expectVisible('#autoBackupStatus');
    
    await testUtils.click('#newBookBtn');
    
    const statusText = await testUtils.page.locator('#autoBackupStatus').textContent();
    expect(statusText.toLowerCase()).toContain('backup');
  });

});
