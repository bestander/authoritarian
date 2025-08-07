// Stress tests and edge cases
const { test, expect } = require('@playwright/test');
const { TestUtils } = require('./setup');

test.describe('Stress Tests & Edge Cases', () => {
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

  test('should handle many chapters', async () => {
    await testUtils.click('#newBookBtn');
    await testUtils.type('#bookTitleEditor', 'Stress Test Book');
    
    // Add many chapters
    const chapterCount = 15;
    for (let i = 1; i < chapterCount; i++) {
      await testUtils.addChapterWithContent(`Chapter ${i + 1}`, `Content for chapter ${i + 1}`);
    }
    
    await testUtils.expectCount('.chapter', chapterCount);
    
    const book = await testUtils.getCurrentBook();
    expect(book.chapters).toHaveLength(chapterCount);
    
    // Verify we can still add more
    await testUtils.click('#addChapterBtn');
    await testUtils.expectCount('.chapter', chapterCount + 1);
  });

  test('should handle extensive history generation', async () => {
    await testUtils.createBookWithContent('History Stress Test', 'Chapter', 'Initial');
    
    // Make multiple changes with history generation
    for (let i = 1; i <= 10; i++) {
      await testUtils.type('.chapter-content', `Version ${i} content`);
      await testUtils.triggerAutoBackup();
    }
    
    // Check history
    const historyCount = await testUtils.getHistoryCount();
    expect(historyCount).toBeGreaterThan(5);
    
    // Should still be able to restore
    await testUtils.restoreFromHistory(0);
    
    // And delete history
    await testUtils.deleteHistoryItem(0);
  });

  test('should handle empty content gracefully', async () => {
    await testUtils.click('#newBookBtn');
    await testUtils.type('#bookTitleEditor', '');
    
    // Should default to "Untitled Book"
    const book = await testUtils.getCurrentBook();
    expect(book.title).toBe('Untitled Book');
    
    // Empty chapter content should be handled
    await testUtils.type('.chapter-content', '');
    expect(book.chapters[0].content).toBe('');
  });

  test('should handle special characters and HTML', async () => {
    const specialTitle = 'Book with "quotes" & <tags> and émojis 📚';
    const specialContent = '<script>alert("xss")</script>\nNew line content\t\tWith tabs';
    
    await testUtils.createBookWithContent(specialTitle, 'Special Chapter', specialContent);
    
    const book = await testUtils.getCurrentBook();
    expect(book.title).toBe(specialTitle);
    expect(book.chapters[0].content).toBe(specialContent);
    
    // Verify content is properly escaped in DOM
    await testUtils.expectValue('#bookTitleEditor', specialTitle);
    await testUtils.expectValue('.chapter-content', specialContent);
  });

  test('should handle rapid editing without data loss', async () => {
    await testUtils.click('#newBookBtn');
    
    // Rapid editing simulation
    for (let i = 0; i < 20; i++) {
      await testUtils.type('#bookTitleEditor', `Title ${i}`);
      await testUtils.type('.chapter-content', `Content ${i}`);
      await testUtils.page.waitForTimeout(25); // Very short delay
    }
    
    const book = await testUtils.getCurrentBook();
    expect(book.title).toContain('Title 19');
    expect(book.chapters[0].content).toContain('Content 19');
  });

  test('should handle large content blocks', async () => {
    const largeContent = 'A'.repeat(10000); // 10KB of text
    const largeTitle = 'Very Long Title ' + 'Word '.repeat(100);
    
    await testUtils.createBookWithContent(largeTitle, 'Large Chapter', largeContent);
    
    const book = await testUtils.getCurrentBook();
    expect(book.title).toBe(largeTitle);
    expect(book.chapters[0].content).toBe(largeContent);
    
    // Should still be able to navigate
    await testUtils.click('#backToListBtn');
    await testUtils.expectVisible('#bookList');
  });

  test('should handle Unicode and international characters', async () => {
    const unicodeTitle = '中文 العربية русский 日本語 🌍';
    const unicodeContent = 'Multilingual content: Здравствуй мир! こんにちは世界！ ¡Hola mundo!';
    
    await testUtils.createBookWithContent(unicodeTitle, 'Unicode Chapter', unicodeContent);
    
    const book = await testUtils.getCurrentBook();
    expect(book.title).toBe(unicodeTitle);
    expect(book.chapters[0].content).toBe(unicodeContent);
  });

  test('should maintain performance with multiple operations', async () => {
    const startTime = Date.now();
    
    // Create multiple books with content and history
    for (let i = 0; i < 5; i++) {
      await testUtils.createBookWithContent(`Perf Book ${i}`, `Chapter ${i}`, `Content ${i}`);
      await testUtils.addChapterWithContent(`Chapter ${i}-2`, `More content ${i}`);
      await testUtils.triggerAutoBackup();
      await testUtils.click('#backToListBtn');
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Should complete within reasonable time (30 seconds)
    expect(duration).toBeLessThan(30000);
    
    // Verify all books were created
    await testUtils.expectCount('.book-item', 5);
  });

  test('should handle browser storage limits gracefully', async () => {
    await testUtils.createBookWithContent('Storage Test', 'Chapter', 'Initial content');
    
    // Create extensive history to test storage limits
    for (let i = 0; i < 30; i++) {
      const content = `Large content block ${i} `.repeat(1000);
      await testUtils.type('.chapter-content', content);
      await testUtils.triggerAutoBackup();
    }
    
    // Should still function correctly
    const book = await testUtils.getCurrentBook();
    expect(book).toBeTruthy();
    
    const historyCount = await testUtils.getHistoryCount();
    expect(historyCount).toBeLessThanOrEqual(20); // Should respect history limit
  });

  test('should handle navigation during save operations', async () => {
    await testUtils.click('#newBookBtn');
    await testUtils.type('#bookTitleEditor', 'Navigation Test');
    
    // Start typing and immediately navigate away
    await testUtils.type('.chapter-content', 'Quick content change');
    await testUtils.click('#backToListBtn'); // Navigate immediately
    
    // Navigate back and verify content was saved
    await testUtils.page.locator('.book-item .btn:not(.btn-danger)').first().click();
    await testUtils.expectValue('.chapter-content', 'Quick content change');
  });

});
