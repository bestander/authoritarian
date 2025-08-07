// Chapter management tests
const { test, expect } = require('@playwright/test');
const { TestUtils } = require('./setup');

test.describe('Chapter Management', () => {
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

  test('should add new chapters', async () => {
    await testUtils.click('#newBookBtn');
    
    // Add second chapter
    await testUtils.click('#addChapterBtn');
    await testUtils.expectCount('.chapter', 2);
    
    // Add third chapter
    await testUtils.click('#addChapterBtn');
    await testUtils.expectCount('.chapter', 3);
    
    const book = await testUtils.getCurrentBook();
    expect(book.chapters).toHaveLength(3);
  });

  test('should edit chapter content', async () => {
    await testUtils.createBookWithContent('Book', 'Original Title', 'Original Content');
    
    // Edit chapter title and content
    await testUtils.type('.chapter-title', 'Updated Title');
    await testUtils.type('.chapter-content', 'Updated Content');
    
    const book = await testUtils.getCurrentBook();
    expect(book.chapters[0].title).toBe('Updated Title');
    expect(book.chapters[0].content).toBe('Updated Content');
  });

  test('should delete chapters', async ({ page }) => {
    await testUtils.click('#newBookBtn');
    await testUtils.click('#addChapterBtn');
    await testUtils.click('#addChapterBtn');
    
    await testUtils.expectCount('.chapter', 3);
    
    // Mock confirm dialog
    await testUtils.mockConfirm(true);
    
    // Delete middle chapter
    await testUtils.page.locator('.delete-chapter').nth(1).click();
    
    await testUtils.wait();
    await testUtils.expectCount('.chapter', 2);
  });

  test('should not delete last chapter', async ({ page }) => {
    await testUtils.click('#newBookBtn');
    
    // The delete button should be disabled when only one chapter exists
    const deleteButton = page.locator('.delete-chapter').first();
    await expect(deleteButton).toBeDisabled();
  });

  test('should handle multiple chapters with content', async () => {
    await testUtils.click('#newBookBtn');
    await testUtils.type('#bookTitleEditor', 'Multi-Chapter Book');
    
    // Add content to first chapter
    await testUtils.type('.chapter-title', 'Chapter 1: Introduction');
    await testUtils.type('.chapter-content', 'This is the introduction chapter.');
    
    // Add second chapter with content
    await testUtils.addChapterWithContent('Chapter 2: Development', 'This is the development chapter.');
    
    // Add third chapter with content
    await testUtils.addChapterWithContent('Chapter 3: Conclusion', 'This is the conclusion chapter.');
    
    await testUtils.expectCount('.chapter', 3);
    
    const book = await testUtils.getCurrentBook();
    expect(book.chapters).toHaveLength(3);
    expect(book.chapters[1].title).toBe('Chapter 2: Development');
    expect(book.chapters[2].content).toBe('This is the conclusion chapter.');
  });

  test('should preserve chapter order during editing', async () => {
    await testUtils.click('#newBookBtn');
    
    // Fill the first chapter that gets created automatically
    await testUtils.type('.chapter-title', 'Chapter 1');
    await testUtils.type('.chapter-content', 'Content 1');
    
    // Add additional chapters
    await testUtils.addChapterWithContent('Chapter 2', 'Content 2');
    await testUtils.addChapterWithContent('Chapter 3', 'Content 3');
    
    // Edit middle chapter (second chapter)
    const secondChapterTitle = '.chapter:nth-child(2) .chapter-title';
    const secondChapterContent = '.chapter:nth-child(2) .chapter-content';
    
    await testUtils.type(secondChapterTitle, 'Updated Chapter 2');
    await testUtils.type(secondChapterContent, 'Updated Content 2');
    
    // Verify order is preserved
    const book = await testUtils.getCurrentBook();
    expect(book.chapters[1].title).toBe('Updated Chapter 2');
    expect(book.chapters[1].content).toBe('Updated Content 2');
    expect(book.chapters[0].title).toBe('Chapter 1');
    expect(book.chapters[2].title).toBe('Chapter 3');
  });

});
