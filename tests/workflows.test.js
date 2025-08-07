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
    
    // History is sorted newest first:
    // Index 0 = Version 3, Index 1 = Version 2, Index 2 = Version 1
    
    // Should be able to traverse history
    await testUtils.restoreFromHistory(1); // Restore to Version 2
    await testUtils.expectValue('.chapter-content', 'Version 2');
    
    await testUtils.restoreFromHistory(2); // Restore to Version 1 (earliest)
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
    
    // Edit first book again (this makes Book 1 most recently edited)
    await testUtils.page.locator('.book-item .btn:not(.btn-danger)').nth(1).click();
    await testUtils.type('.chapter-content', 'Updated Content 1');
    await testUtils.triggerAutoBackup();
    
    // Verify history persisted across navigation
    await testUtils.click('#showHistoryBtn');
    const historyCount = await testUtils.page.locator('.backup-item').count();
    expect(historyCount).toBeGreaterThan(0);
    
    // Navigate back and verify Book 1 is now first (most recent) due to sorting
    await testUtils.click('#backToListBtn');
    await testUtils.page.locator('.book-item .btn:not(.btn-danger)').first().click();
    await testUtils.expectValue('#bookTitleEditor', 'Book 1'); // Book 1 is now first due to recent edit
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

  test('export and import multiple books workflow', async () => {
    // Create multiple books with different content
    await testUtils.createBookWithContent('First Book', 'Chapter 1', 'Content of first book');
    await testUtils.addChapterWithContent('Chapter 2', 'More content in first book');
    await testUtils.click('#backToListBtn');
    
    await testUtils.createBookWithContent('Second Book', 'Intro', 'Content of second book');
    await testUtils.addChapterWithContent('Main Content', 'Main content of second book');
    await testUtils.addChapterWithContent('Conclusion', 'Conclusion content');
    await testUtils.click('#backToListBtn');
    
    await testUtils.createBookWithContent('Third Book', 'Solo Chapter', 'Single chapter book');
    await testUtils.click('#backToListBtn');
    
    // Verify we have 3 books
    await testUtils.expectCount('.book-item', 3);
    
    // Get export data structure
    const exportedBooks = await testUtils.page.evaluate(() => {
      // Simulate what exportBackup() does
      const books = Object.values(window.app.books);
      // Sort by lastEdited (most recent first) to match what we expect
      books.sort((a, b) => b.lastEdited - a.lastEdited);
      return { books };
    });
    
    // Verify export structure
    expect(exportedBooks.books).toHaveLength(3);
    expect(exportedBooks.books[0].title).toBe('Third Book'); // Most recent first
    expect(exportedBooks.books[1].title).toBe('Second Book');
    expect(exportedBooks.books[2].title).toBe('First Book');
    
    // Verify all books have proper structure
    exportedBooks.books.forEach(book => {
      expect(book).toHaveProperty('id');
      expect(book).toHaveProperty('title');
      expect(book).toHaveProperty('chapters');
      expect(book).toHaveProperty('lastEdited');
      expect(book.chapters.length).toBeGreaterThan(0);
    });
    
    // Verify specific book contents
    const firstBook = exportedBooks.books.find(b => b.title === 'First Book');
    const secondBook = exportedBooks.books.find(b => b.title === 'Second Book');
    const thirdBook = exportedBooks.books.find(b => b.title === 'Third Book');
    
    expect(firstBook.chapters).toHaveLength(2);
    expect(secondBook.chapters).toHaveLength(3);
    expect(thirdBook.chapters).toHaveLength(1);
    
    expect(firstBook.chapters[0].content).toBe('Content of first book');
    expect(secondBook.chapters[1].title).toBe('Main Content');
    expect(thirdBook.chapters[0].title).toBe('Solo Chapter');
    
    // Simulate import by clearing storage and reimporting
    await testUtils.page.evaluate((importData) => {
      // Clear current books
      localStorage.clear();
      window.app.books = {};
      
      // Simulate importBackup() logic
      const newBooks = {};
      importData.books.forEach(book => {
        if (book.id) {
          newBooks[book.id] = book;
        }
      });
      
      window.app.books = newBooks;
      window.app.saveToStorage();
      window.app.renderBookList();
    }, exportedBooks);
    
    // Wait for UI to update
    await testUtils.wait(200);
    
    // Verify all books were imported correctly
    await testUtils.expectCount('.book-item', 3);
    
    // Verify book titles are visible in the list
    const bookTitles = await testUtils.page.$$eval('.book-title', elements => 
      elements.map(el => el.textContent)
    );
    
    expect(bookTitles).toContain('First Book');
    expect(bookTitles).toContain('Second Book');
    expect(bookTitles).toContain('Third Book');
    
    // Verify we can edit imported books
    await testUtils.page.locator('.book-item .btn:not(.btn-danger)').first().click();
    await testUtils.expectVisible('#editor');
    
    // Get the book data to verify content integrity
    const importedBook = await testUtils.getCurrentBook();
    expect(importedBook.chapters.length).toBeGreaterThan(0);
    expect(importedBook.chapters[0].content).toBeTruthy();
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
