// Playwright test utilities and global setup
const { expect } = require('@playwright/test');

class TestUtils {
  constructor(page) {
    this.page = page;
  }

  // Wait helpers
  async wait(ms = 100) {
    await this.page.waitForTimeout(ms);
  }

  async waitForApp() {
    await this.page.waitForFunction(() => window.app !== undefined);
  }

  // Action helpers
  async click(selector) {
    await this.page.click(selector);
    await this.wait();
  }

  async type(selector, text) {
    await this.page.fill(selector, text);
    await this.page.dispatchEvent(selector, 'blur');
    await this.wait();
  }

  async doubleClick(selector) {
    await this.page.dblclick(selector);
    await this.wait();
  }

  async pressKey(key) {
    await this.page.keyboard.press(key);
    await this.wait();
  }

  // Auto-backup simulation
  async triggerAutoBackup() {
    await this.page.evaluate(() => {
      if (window.app && window.app.currentBookId) {
        window.app.markActivity();
        window.app.lastActivityTime = Date.now() - 65000; // 65 seconds ago
        window.app.checkForIdleBackup();
      }
    });
    await this.wait(200);
  }

  // Assertion helpers
  async expectVisible(selector) {
    await expect(this.page.locator(selector)).toBeVisible();
  }

  async expectHidden(selector) {
    await expect(this.page.locator(selector)).toBeHidden();
  }

  async expectText(selector, text) {
    await expect(this.page.locator(selector)).toHaveText(text);
  }

  async expectValue(selector, value) {
    await expect(this.page.locator(selector)).toHaveValue(value);
  }

  async expectCount(selector, count) {
    await expect(this.page.locator(selector)).toHaveCount(count);
  }

  // App state helpers
  async getBookCount() {
    return await this.page.evaluate(() => Object.keys(window.app.books).length);
  }

  async getCurrentBook() {
    return await this.page.evaluate(() => {
      if (!window.app.currentBookId) return null;
      return window.app.books[window.app.currentBookId];
    });
  }

  async getHistoryCount() {
    return await this.page.evaluate(() => {
      if (!window.app.currentBookId) return 0;
      const book = window.app.books[window.app.currentBookId];
      return book && book.changeHistory ? book.changeHistory.length : 0;
    });
  }

  // Mock dialogs
  async mockConfirm(returnValue = true) {
    await this.page.evaluate((value) => {
      window.confirm = () => value;
    }, returnValue);
  }

  async mockAlert() {
    await this.page.evaluate(() => {
      window.alert = () => {};
    });
  }

  // Complex actions
  async createBookWithContent(title, chapterTitle, chapterContent) {
    await this.click('#newBookBtn');
    await this.type('#bookTitleEditor', title);
    await this.type('.chapter-title', chapterTitle);
    await this.type('.chapter-content', chapterContent);
    
    // Ensure the book is fully saved before proceeding
    await this.page.evaluate(() => {
      if (window.app && window.app.currentBookId) {
        const book = window.app.books[window.app.currentBookId];
        if (book) {
          book.lastEdited = Date.now();
          window.app.saveToStorage();
        }
      }
    });
    
    await this.wait(100); // Give time for save to complete
    return await this.getCurrentBook();
  }

  async addChapterWithContent(title, content) {
    await this.click('#addChapterBtn');
    
    // Get the last chapter elements
    const chapterCount = await this.page.locator('.chapter').count();
    const lastChapterTitle = `.chapter:nth-child(${chapterCount}) .chapter-title`;
    const lastChapterContent = `.chapter:nth-child(${chapterCount}) .chapter-content`;
    
    await this.type(lastChapterTitle, title);
    await this.type(lastChapterContent, content);
  }

  async createMultipleBooks(count, titlePrefix = 'Book') {
    const books = [];
    for (let i = 1; i <= count; i++) {
      const title = `${titlePrefix} ${i}`;
      await this.createBookWithContent(title, `Chapter 1`, `Content for ${title}`);
      books.push(await this.getCurrentBook());
      
      // Go back to list and wait for it to render
      await this.click('#backToListBtn');
      await this.expectVisible('#bookList');
      await this.wait(300); // Wait for list to fully update
      
      // Verify the book appears in the list
      await this.expectCount('.book-item', i);
    }
    return books;
  }

  async restoreFromHistory(historyIndex = 0) {
    await this.click('#showHistoryBtn');
    await this.expectVisible('#changeHistory');
    
    const historyItems = this.page.locator('.backup-item');
    const count = await historyItems.count();
    
    if (count === 0) {
      throw new Error('No history items available');
    }
    
    if (historyIndex >= count) {
      throw new Error(`History index ${historyIndex} out of bounds`);
    }
    
    await this.mockConfirm(true);
    await this.mockAlert();
    
    const restoreButton = historyItems.nth(historyIndex).locator('.btn:not(.btn-danger)');
    await restoreButton.click();
    await this.wait();
  }

  async deleteHistoryItem(historyIndex = 0) {
    await this.click('#showHistoryBtn');
    await this.expectVisible('#changeHistory');
    
    const historyItems = this.page.locator('.backup-item');
    const count = await historyItems.count();
    
    if (count === 0) {
      throw new Error('No history items available');
    }
    
    if (historyIndex >= count) {
      throw new Error(`History index ${historyIndex} out of bounds`);
    }
    
    await this.mockConfirm(true);
    
    const deleteButton = historyItems.nth(historyIndex).locator('.btn-danger');
    await deleteButton.click();
    await this.wait();
  }

  // Screenshot helper for debugging
  async screenshot(name) {
    await this.page.screenshot({ path: `tests/screenshots/${name}.png` });
  }
}

module.exports = { TestUtils };
