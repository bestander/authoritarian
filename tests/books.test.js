// Book management tests
const { test, expect } = require('@playwright/test');
const { TestUtils } = require('./setup');

test.describe('Book Management', () => {
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

  test('should create multiple books', async () => {
    await testUtils.createMultipleBooks(3, 'Book');
    
    await testUtils.expectCount('.book-item', 3);
    
    const bookCount = await testUtils.getBookCount();
    expect(bookCount).toBe(3);
  });

  test('should edit existing book', async () => {
    await testUtils.createBookWithContent('Original Book', 'Chapter', 'Content');
    await testUtils.click('#backToListBtn');
    
    // Click edit button (first button that's not btn-danger)
    await testUtils.page.locator('.book-item .btn:not(.btn-danger)').first().click();
    
    await testUtils.expectVisible('#editor');
    await testUtils.expectValue('#bookTitleEditor', 'Original Book');
  });

  test('should delete book', async () => {
    await testUtils.createBookWithContent('Book to Delete', 'Chapter', 'Content');
    await testUtils.click('#backToListBtn');
    
    await testUtils.mockConfirm(true);
    
    const deleteButton = testUtils.page.locator('.book-item .btn-danger').first();
    await deleteButton.click();
    
    await testUtils.wait();
    
    await testUtils.expectVisible('#emptyState');
    await testUtils.expectCount('.book-item', 0);
    
    const bookCount = await testUtils.getBookCount();
    expect(bookCount).toBe(0);
  });

  test('should inline edit book title', async () => {
    await testUtils.createBookWithContent('Original Title', 'Chapter', 'Content');
    await testUtils.click('#backToListBtn');
    
    // Double-click to edit inline
    await testUtils.doubleClick('.book-title');
    
    const input = testUtils.page.locator('.book-title.editing');
    await expect(input).toBeVisible();
    
    await input.fill('New Title');
    await testUtils.pressKey('Enter');
    
    await testUtils.wait(200);
    
    await testUtils.expectText('.book-title', 'New Title');
  });

  test('should sort books by last edited', async () => {
    // Create first book
    await testUtils.createBookWithContent('First Book', 'Chapter', 'Content');
    await testUtils.click('#backToListBtn');
    
    await testUtils.wait(100); // Small delay to ensure different timestamps
    
    // Create second book
    await testUtils.createBookWithContent('Second Book', 'Chapter', 'Content');
    await testUtils.click('#backToListBtn');
    
    // The most recently edited book should appear first
    const firstBookTitle = await testUtils.page.locator('.book-item:first-child .book-title').textContent();
    expect(firstBookTitle).toBe('Second Book');
  });

  test('should maintain book list state after operations', async () => {
    await testUtils.createMultipleBooks(3, 'Test Book');
    
    // Edit one book
    await testUtils.page.locator('.book-item .btn:not(.btn-danger)').first().click();
    await testUtils.type('#bookTitleEditor', 'Updated Book Title');
    await testUtils.click('#backToListBtn');
    
    // Delete another book
    await testUtils.mockConfirm(true);
    await testUtils.page.locator('.book-item .btn-danger').nth(1).click();
    await testUtils.wait();
    
    // Should have 2 books remaining
    await testUtils.expectCount('.book-item', 2);
    
    const bookCount = await testUtils.getBookCount();
    expect(bookCount).toBe(2);
  });

  test('should handle book with no title gracefully', async () => {
    await testUtils.click('#newBookBtn');
    await testUtils.type('#bookTitleEditor', '');
    
    // Should default to "Untitled Book"
    const book = await testUtils.getCurrentBook();
    expect(book.title).toBe('Untitled Book');
  });

  test('should display book metadata correctly', async () => {
    await testUtils.createBookWithContent('Meta Test Book', 'Chapter', 'Content');
    await testUtils.click('#backToListBtn');
    
    // Check that book shows creation/edit date
    const bookMeta = testUtils.page.locator('.book-item .book-meta').first();
    const metaText = await bookMeta.textContent();
    
    expect(metaText).toBeTruthy();
    expect(metaText.trim()).not.toBe('');
  });

});
