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
    // Create books one by one and verify each step
    await testUtils.click('#newBookBtn');
    await testUtils.type('#bookTitleEditor', 'Book 1');
    await testUtils.type('.chapter-content', 'Content 1');
    await testUtils.click('#backToListBtn');
    await testUtils.expectVisible('#bookList');
    await testUtils.wait(200);
    await testUtils.expectCount('.book-item', 1);
    
    // Second book
    await testUtils.click('#newBookBtn');
    await testUtils.type('#bookTitleEditor', 'Book 2');
    await testUtils.type('.chapter-content', 'Content 2');
    await testUtils.click('#backToListBtn');
    await testUtils.expectVisible('#bookList');
    await testUtils.wait(200);
    await testUtils.expectCount('.book-item', 2);
    
    // Third book
    await testUtils.click('#newBookBtn');
    await testUtils.type('#bookTitleEditor', 'Book 3');
    await testUtils.type('.chapter-content', 'Content 3');
    await testUtils.click('#backToListBtn');
    await testUtils.expectVisible('#bookList');
    await testUtils.wait(200);
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
    
    await testUtils.wait(300);
    
    await testUtils.expectCount('.book-item', 0);
    await testUtils.expectVisible('#emptyState');
    
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
    
    // Wait for the book list to re-render after saving (the app does this automatically)
    await testUtils.wait(500);
    
    // Check if the title was updated by finding any book-title with the new text
    const titleElements = testUtils.page.locator('.book-title');
    const count = await titleElements.count();
    let found = false;
    
    for (let i = 0; i < count; i++) {
      const text = await titleElements.nth(i).textContent();
      if (text === 'New Title') {
        found = true;
        break;
      }
    }
    
    expect(found).toBe(true);
  });

  test('should sort books by last edited', async () => {
    // Create first book
    await testUtils.createBookWithContent('First Book', 'Chapter', 'Content');
    await testUtils.click('#backToListBtn');
    
    await testUtils.wait(100); // Small delay to ensure different timestamps
    
    // Create second book
    await testUtils.createBookWithContent('Second Book', 'Chapter', 'Content');
    await testUtils.click('#backToListBtn');
    
    // The most recently edited book should appear first - find the first visible book item
    const firstBookTitle = await testUtils.page.locator('.book-item .book-title').first().textContent();
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
