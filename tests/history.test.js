// Change history and auto-backup tests
const { test, expect } = require('@playwright/test');
const { TestUtils } = require('./setup');

test.describe('Change History & Auto-backup', () => {
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

  test('should create change history', async () => {
    await testUtils.createBookWithContent('History Book', 'Chapter', 'Initial content');
    
    // Create initial history
    await testUtils.triggerAutoBackup();
    
    // Make a change
    await testUtils.type('.chapter-content', 'Modified content');
    await testUtils.triggerAutoBackup();
    
    // Show history
    await testUtils.click('#showHistoryBtn');
    await testUtils.expectVisible('#changeHistory');
    
    const historyItems = await testUtils.page.locator('.backup-item').count();
    expect(historyItems).toBeGreaterThan(0);
    
    const historyCount = await testUtils.getHistoryCount();
    expect(historyCount).toBeGreaterThan(0);
  });

  test('should restore from change history', async () => {
    await testUtils.createBookWithContent('Restore Book', 'Original Chapter', 'Original content');
    await testUtils.triggerAutoBackup();
    
    // Make changes
    await testUtils.type('.chapter-title', 'Modified Chapter');
    await testUtils.type('.chapter-content', 'Modified content');
    
    // Restore from history
    await testUtils.restoreFromHistory(0);
    
    // Should have restored original content
    await testUtils.expectValue('.chapter-title', 'Original Chapter');
    await testUtils.expectValue('.chapter-content', 'Original content');
    
    const book = await testUtils.getCurrentBook();
    expect(book.chapters[0].title).toBe('Original Chapter');
  });

  test('should delete history entries', async () => {
    await testUtils.createBookWithContent('Delete History Book', 'Chapter', 'Content');
    await testUtils.triggerAutoBackup();
    await testUtils.triggerAutoBackup(); // Create multiple entries
    
    const initialCount = await testUtils.getHistoryCount();
    expect(initialCount).toBeGreaterThan(0);
    
    await testUtils.deleteHistoryItem(0);
    
    const finalCount = await testUtils.getHistoryCount();
    expect(finalCount).toBe(initialCount - 1);
  });

  test('should show history timeline correctly', async () => {
    await testUtils.createBookWithContent('Timeline Book', 'Chapter', 'Version 1');
    await testUtils.triggerAutoBackup();
    
    await testUtils.type('.chapter-content', 'Version 2');
    await testUtils.triggerAutoBackup();
    
    await testUtils.type('.chapter-content', 'Version 3');
    await testUtils.triggerAutoBackup();
    
    await testUtils.click('#showHistoryBtn');
    
    const historyItems = await testUtils.page.locator('.backup-item').count();
    expect(historyItems).toBeGreaterThanOrEqual(2);
    
    // Check that dates are displayed
    const firstItem = testUtils.page.locator('.backup-item').first();
    const dateElement = firstItem.locator('.backup-date');
    
    await expect(dateElement).toBeVisible();
    const dateText = await dateElement.textContent();
    expect(dateText.trim()).not.toBe('');
  });

  test('should traverse history multiple times', async () => {
    await testUtils.createBookWithContent('History Workflow', 'Chapter 1', 'Version 1');
    await testUtils.triggerAutoBackup();
    
    await testUtils.type('.chapter-content', 'Version 2');
    await testUtils.triggerAutoBackup();
    
    await testUtils.type('.chapter-content', 'Version 3');
    await testUtils.triggerAutoBackup();
    
    // Restore to version 2
    await testUtils.restoreFromHistory(1);
    await testUtils.expectValue('.chapter-content', 'Version 2');
    
    // Restore to version 1
    await testUtils.restoreFromHistory(0);
    await testUtils.expectValue('.chapter-content', 'Version 1');
  });

  test('should handle history limit correctly', async () => {
    await testUtils.createBookWithContent('Limit Test Book', 'Chapter', 'Initial');
    
    // Create many history entries (more than the limit of 20)
    for (let i = 1; i <= 25; i++) {
      await testUtils.type('.chapter-content', `Version ${i}`);
      await testUtils.triggerAutoBackup();
    }
    
    const historyCount = await testUtils.getHistoryCount();
    expect(historyCount).toBeLessThanOrEqual(20);
  });

  test('should toggle history view', async () => {
    await testUtils.createBookWithContent('Toggle Book', 'Chapter', 'Content');
    await testUtils.triggerAutoBackup();
    
    // Show history
    await testUtils.click('#showHistoryBtn');
    await testUtils.expectVisible('#changeHistory');
    
    // Hide history
    await testUtils.click('#toggleHistoryBtn');
    await testUtils.expectHidden('#changeHistory');
  });

  test('should update auto-backup status correctly', async () => {
    await testUtils.click('#newBookBtn');
    
    const statusElement = testUtils.page.locator('#autoBackupStatus');
    let statusText = await statusElement.textContent();
    
    // Should show backup status
    expect(statusText.toLowerCase()).toContain('backup');
    
    // After creating history, status should update
    await testUtils.type('.chapter-content', 'Some content');
    await testUtils.triggerAutoBackup();
    
    await testUtils.wait(100);
    statusText = await statusElement.textContent();
    expect(statusText.toLowerCase()).toContain('backup');
  });

});
