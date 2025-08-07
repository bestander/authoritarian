// Advanced workflow and integration tests
const { test, expect } = require('@playwright/test');
const { TestUtils } = require('./setup');

test.describe('Advanced Workflows', () => {
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

  test('complete book creation and editing workflow', async () => {
    // Create book with initial content
    await testUtils.createBookWithContent('My Novel', 'The Beginning', 'Once upon a time...');
    
    // Add more chapters
    await testUtils.addChapterWithContent('The Middle', 'Plot thickens...');
    await testUtils.addChapterWithContent('The End', 'And they lived happily...');
    
    // Verify structure
    await testUtils.expectCount('.chapter', 3);
    
    // Create history
    await testUtils.triggerAutoBackup();
    
    // Make changes
    await testUtils.type('.chapter-content', 'Updated beginning content');
    await testUtils.triggerAutoBackup();
    
    // Verify history
    await testUtils.click('#showHistoryBtn');
    await testUtils.expectVisible('#changeHistory');
    
    const historyItems = await testUtils.page.locator('.backup-item').count();
    expect(historyItems).toBeGreaterThan(0);
    
    const book = await testUtils.getCurrentBook();
    expect(book).toBeTruthy();
    expect(book.chapters).toHaveLength(3);
  });

  test('multiple book management workflow', async () => {
    // Create multiple books
    const books = await testUtils.createMultipleBooks(3, 'Test Book');
    expect(books).toHaveLength(3);
    
    // Edit first book
    await testUtils.page.locator('.book-item .btn:not(.btn-danger)').first().click();
    await testUtils.type('#bookTitleEditor', 'Updated Book Title');
    await testUtils.click('#backToListBtn');
    
    // Delete second book
    await testUtils.mockConfirm(true);
    await testUtils.page.locator('.book-item .btn-danger').nth(1).click();
    await testUtils.wait();
    
    // Verify final state
    await testUtils.expectCount('.book-item', 2);
    
    const finalBookCount = await testUtils.getBookCount();
    expect(finalBookCount).toBe(2);
  });

  test('history traversal workflow', async () => {
    await testUtils.createBookWithContent('History Workflow', 'Chapter 1', 'Version 1');
    await testUtils.triggerAutoBackup();
    
    await testUtils.type('.chapter-content', 'Version 2');
    await testUtils.triggerAutoBackup();
    
    await testUtils.type('.chapter-content', 'Version 3');
    await testUtils.triggerAutoBackup();
    
    // Should be able to traverse history
    await testUtils.restoreFromHistory(1); // Restore to earlier version
    await testUtils.expectValue('.chapter-content', 'Version 2');
    
    await testUtils.restoreFromHistory(0); // Restore to earliest version
    await testUtils.expectValue('.chapter-content', 'Version 1');
  });

  test('complex editing session with navigation', async () => {
    // Create first book
    await testUtils.createBookWithContent('Book 1', 'Chapter 1', 'Content 1');
    await testUtils.addChapterWithContent('Chapter 2', 'Content 2');
    await testUtils.triggerAutoBackup();
    await testUtils.click('#backToListBtn');
    
    // Create second book
    await testUtils.createBookWithContent('Book 2', 'Chapter A', 'Content A');
    await testUtils.triggerAutoBackup();
    await testUtils.click('#backToListBtn');
    
    // Edit first book again
    await testUtils.page.locator('.book-item .btn:not(.btn-danger)').nth(1).click();
    await testUtils.type('.chapter-content', 'Updated Content 1');
    await testUtils.triggerAutoBackup();
    
    // Verify history persisted across navigation
    await testUtils.click('#showHistoryBtn');
    const historyCount = await testUtils.page.locator('.backup-item').count();
    expect(historyCount).toBeGreaterThan(0);
    
    // Navigate back and verify second book unchanged
    await testUtils.click('#backToListBtn');
    await testUtils.page.locator('.book-item .btn:not(.btn-danger)').first().click();
    await testUtils.expectValue('#bookTitleEditor', 'Book 2');
  });

  test('export and import workflow simulation', async () => {
    // Create book with content
    await testUtils.createBookWithContent('Export Test Book', 'Test Chapter', 'Test content for export');
    await testUtils.addChapterWithContent('Second Chapter', 'More content');
    await testUtils.click('#backToListBtn');
    
    // Simulate export by checking data structure
    const allBooks = await testUtils.page.evaluate(() => {
      return Object.values(window.app.books);
    });
    
    expect(allBooks).toHaveLength(1);
    expect(allBooks[0].title).toBe('Export Test Book');
    expect(allBooks[0].chapters).toHaveLength(2);
    
    // Verify data is properly structured for export
    expect(allBooks[0]).toHaveProperty('id');
    expect(allBooks[0]).toHaveProperty('title');
    expect(allBooks[0]).toHaveProperty('chapters');
    expect(allBooks[0]).toHaveProperty('lastEdited');
  });

  test('concurrent editing simulation', async () => {
    await testUtils.createBookWithContent('Concurrent Test', 'Chapter', 'Initial');
    
    // Simulate rapid editing
    for (let i = 1; i <= 5; i++) {
      await testUtils.type('#bookTitleEditor', `Title Update ${i}`);
      await testUtils.type('.chapter-content', `Content Update ${i}`);
      await testUtils.wait(50); // Minimal delay
    }
    
    // Verify final state
    const book = await testUtils.getCurrentBook();
    expect(book.title).toContain('Title Update 5');
    expect(book.chapters[0].content).toContain('Content Update 5');
  });

  test('recovery after navigation interruption', async () => {
    await testUtils.createBookWithContent('Recovery Test', 'Chapter', 'Original Content');
    const originalBookId = (await testUtils.getCurrentBook()).id;
    
    // Start editing
    await testUtils.type('.chapter-content', 'Modified Content');
    
    // Navigate away without explicit save
    await testUtils.click('#backToListBtn');
    
    // Navigate back
    await testUtils.page.locator('.book-item .btn:not(.btn-danger)').first().click();
    
    // Content should be preserved
    await testUtils.expectValue('.chapter-content', 'Modified Content');
    
    const restoredBook = await testUtils.getCurrentBook();
    expect(restoredBook.id).toBe(originalBookId);
  });

});
