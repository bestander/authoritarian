class BookAuthor {
    constructor() {
        this.books = this.loadFromStorage();
        this.currentBookId = null;
        this.autoBackupInterval = null;
        this.initializeEventListeners();
        this.renderBookList();
        this.startAutoBackup();
        this.updateAutoBackupStatus();
    }

    loadFromStorage() {
        const data = localStorage.getItem('bookAuthorData');
        if (!data) return {};
        
        const parsed = JSON.parse(data);
        
        // Check if we have old format {books: [...]} and migrate to new format
        if (parsed.books && Array.isArray(parsed.books)) {
            const newFormat = {};
            parsed.books.forEach(book => {
                if (book.id) {
                    newFormat[book.id] = book;
                }
            });
            
            // Save the migrated data immediately
            localStorage.setItem('bookAuthorData', JSON.stringify(newFormat));
            return newFormat;
        }
        
        // Already in new format or empty
        return parsed;
    }

    saveToStorage() {
        localStorage.setItem('bookAuthorData', JSON.stringify(this.books));
        // Mark activity for auto-backup system
        this.markActivity();
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Auto-backup functionality
    startAutoBackup() {
        this.lastActivityTime = Date.now();
        this.pendingBackup = false;
        
        // Clear any existing interval
        if (this.autoBackupInterval) {
            clearInterval(this.autoBackupInterval);
        }

        // Create backup immediately if none exists
        this.createAutoBackup();

        // Check every 10 seconds if we need to create a backup
        this.autoBackupInterval = setInterval(() => {
            this.checkForIdleBackup();
        }, 10000);
    }

    checkForIdleBackup() {
        const now = Date.now();
        const timeSinceLastActivity = now - this.lastActivityTime;
        const oneMinute = 60000; // 60 seconds

        // If more than 1 minute has passed since last activity and we have pending changes
        if (timeSinceLastActivity > oneMinute && this.pendingBackup) {
            this.createAutoBackup();
            this.pendingBackup = false;
            this.updateAutoBackupStatus();
        }
    }

    markActivity() {
        this.lastActivityTime = Date.now();
        this.pendingBackup = true;
    }

    createAutoBackup() {
        if (!this.currentBookId || !this.books[this.currentBookId]) return;

        const book = this.books[this.currentBookId];
        if (!book) return;

        // Initialize change history if it doesn't exist
        if (!book.changeHistory) {
            book.changeHistory = [];
        }

        const now = Date.now();
        
        // Create backup entry for this specific book
        const backup = {
            id: this.generateId(),
            timestamp: now,
            data: JSON.parse(JSON.stringify({
                title: book.title,
                chapters: book.chapters
            })), // Deep copy of book content only
            type: 'auto'
        };

        book.changeHistory.push(backup);

        // Keep only last 20 changes per book
        if (book.changeHistory.length > 20) {
            book.changeHistory.splice(0, book.changeHistory.length - 20);
        }

        // Save the updated book data
        localStorage.setItem('bookAuthorData', JSON.stringify(this.books));
    }

    loadBackupHistory() {
        // No longer needed - keeping for compatibility
        return [];
    }

    saveBackupHistory(backups) {
        // No longer needed - keeping for compatibility
    }

    updateAutoBackupStatus() {
        const statusElement = document.getElementById('autoBackupStatus');
        
        if (!this.currentBookId) {
            statusElement.innerHTML = '<span class="status-dot"></span><span>Auto-backup active</span>';
            statusElement.className = 'auto-backup-status';
            return;
        }

        const book = this.books[this.currentBookId];
        if (!book || !book.changeHistory || book.changeHistory.length === 0) {
            statusElement.innerHTML = '<span class="status-dot"></span><span>Creating first backup...</span>';
            statusElement.className = 'auto-backup-status warning';
        } else {
            const lastBackup = book.changeHistory[book.changeHistory.length - 1];
            const timeSinceLastBackup = Date.now() - lastBackup.timestamp;
            const minutesAgo = Math.floor(timeSinceLastBackup / (1000 * 60));
            
            if (minutesAgo === 0) {
                statusElement.innerHTML = '<span class="status-dot"></span><span>Last backup: Just now</span>';
            } else if (minutesAgo < 60) {
                statusElement.innerHTML = `<span class="status-dot"></span><span>Last backup: ${minutesAgo}m ago</span>`;
            } else {
                const hoursAgo = Math.floor(minutesAgo / 60);
                statusElement.innerHTML = `<span class="status-dot"></span><span>Last backup: ${hoursAgo}h ago</span>`;
            }
            statusElement.className = 'auto-backup-status';
        }
    }

    restoreFromBackup(backupId) {
        if (!this.currentBookId) return;

        const book = this.books[this.currentBookId];
        if (!book || !book.changeHistory) return;

        const backup = book.changeHistory.find(b => b.id === backupId);
        
        if (!backup) {
            alert('Change history entry not found.');
            return;
        }

        if (confirm(`Are you sure you want to restore from ${this.formatDate(backup.timestamp)}? This will replace the current book content.`)) {
            // Restore the book content from backup
            book.title = backup.data.title;
            book.chapters = JSON.parse(JSON.stringify(backup.data.chapters)); // Deep copy
            book.lastEdited = Date.now();
            
            this.saveToStorage();
            
            // Refresh the editor
            document.getElementById('bookTitleEditor').value = book.title;
            this.renderChapters(book.chapters);
            this.renderChangeHistory();
            
            alert('Successfully restored from change history!');
        }
    }

    deleteBackup(backupId) {
        if (!this.currentBookId) return;

        const book = this.books[this.currentBookId];
        if (!book || !book.changeHistory) return;

        if (confirm('Are you sure you want to delete this change history entry?')) {
            book.changeHistory = book.changeHistory.filter(b => b.id !== backupId);
            this.saveToStorage();
            this.renderChangeHistory();
        }
    }

    toggleChangeHistory() {
        const historyElement = document.getElementById('changeHistory');
        const toggleBtn = document.getElementById('toggleHistoryBtn');
        
        if (historyElement.style.display === 'none') {
            historyElement.style.display = 'block';
            toggleBtn.textContent = 'Hide History';
            this.renderChangeHistory();
        } else {
            historyElement.style.display = 'none';
            toggleBtn.textContent = 'Show History';
        }
    }

    showChangeHistory() {
        const historyElement = document.getElementById('changeHistory');
        const toggleBtn = document.getElementById('toggleHistoryBtn');
        
        historyElement.style.display = 'block';
        toggleBtn.textContent = 'Hide History';
        this.renderChangeHistory();
        
        // Scroll to the history section
        historyElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    renderChangeHistory() {
        if (!this.currentBookId) return;

        const book = this.books[this.currentBookId];
        const changeHistoryList = document.getElementById('changeHistoryList');

        if (!book || !book.changeHistory || book.changeHistory.length === 0) {
            changeHistoryList.innerHTML = `
                <div class="empty-state">
                    <p>No changes recorded yet. Changes will appear here after 1 minute of inactivity.</p>
                </div>
            `;
            return;
        }

        // Sort by timestamp (newest first)
        const sortedHistory = [...book.changeHistory].sort((a, b) => b.timestamp - a.timestamp);

        changeHistoryList.innerHTML = sortedHistory.map(backup => `
            <div class="backup-item">
                <div class="backup-info">
                    <div class="backup-date">${this.formatDate(backup.timestamp)}</div>
                    <div class="backup-details">
                        ${backup.data.chapters.length} chapter${backup.data.chapters.length !== 1 ? 's' : ''} • Auto-saved
                    </div>
                </div>
                <div class="backup-actions">
                    <button class="btn btn-small" onclick="app.restoreFromBackup('${backup.id}')">Restore</button>
                    <button class="btn btn-danger btn-small" onclick="app.deleteBackup('${backup.id}')">Delete</button>
                </div>
            </div>
        `).join('');
    }

    initializeEventListeners() {
        // New book button
        document.getElementById('newBookBtn').addEventListener('click', () => {
            this.createNewBook();
        });

        // Back to list button
        document.getElementById('backToListBtn').addEventListener('click', () => {
            this.showBookList();
        });

        // Add chapter button
        document.getElementById('addChapterBtn').addEventListener('click', () => {
            this.addChapter();
        });

        // Book title editor
        document.getElementById('bookTitleEditor').addEventListener('input', (e) => {
            this.updateBookTitle(e.target.value);
        });

        // Export/Import
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportBackup();
        });

        document.getElementById('importBtn').addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });

        document.getElementById('fileInput').addEventListener('change', (e) => {
            this.importBackup(e.target.files[0]);
        });

        // Backup history
        document.getElementById('toggleHistoryBtn').addEventListener('click', () => {
            this.toggleChangeHistory();
        });

        document.getElementById('showHistoryBtn').addEventListener('click', () => {
            this.showChangeHistory();
        });

        // Update backup status periodically
        setInterval(() => {
            this.updateAutoBackupStatus();
        }, 60000); // Update every minute
    }

    createNewBook() {
        const bookId = this.generateId();
        const newBook = {
            id: bookId,
            title: '',
            lastEdited: Date.now(),
            chapters: [{
                id: this.generateId(),
                title: '',
                content: ''
            }],
            changeHistory: []
        };

        this.books[bookId] = newBook;
        this.saveToStorage();
        this.editBook(bookId);
    }

    editBook(bookId) {
        this.currentBookId = bookId;
        const book = this.books[bookId];
        
        if (!book) return;

        // Update last edited
        book.lastEdited = Date.now();
        this.saveToStorage();

        // Show editor
        document.getElementById('bookList').style.display = 'none';
        document.getElementById('editor').classList.add('active');

        // Reset change history toggle
        document.getElementById('changeHistory').style.display = 'none';
        document.getElementById('toggleHistoryBtn').textContent = 'Show History';

        // Populate editor
        document.getElementById('bookTitleEditor').value = book.title;
        this.renderChapters(book.chapters);
        this.updateAutoBackupStatus();
    }

    showBookList() {
        this.currentBookId = null;
        document.getElementById('editor').classList.remove('active');
        document.getElementById('bookList').style.display = 'block';
        this.renderBookList();
    }

    deleteBook(bookId) {
        if (confirm('Are you sure you want to delete this book?')) {
            delete this.books[bookId];
            this.saveToStorage();
            this.renderBookList();
        }
    }

    updateBookTitle(newTitle) {
        if (!this.currentBookId) return;
        
        const book = this.books[this.currentBookId];
        if (book) {
            book.title = newTitle; // Keep the actual title as entered, including empty string
            book.lastEdited = Date.now();
            this.saveToStorage();
        }
    }

    addChapter() {
        if (!this.currentBookId) return;

        const book = this.books[this.currentBookId];
        if (!book) return;

        const newChapter = {
            id: this.generateId(),
            title: '',
            content: ''
        };

        book.chapters.push(newChapter);
        book.lastEdited = Date.now();
        this.saveToStorage();
        this.renderChapters(book.chapters);
    }

    deleteChapter(chapterId) {
        if (!this.currentBookId) return;

        const book = this.books[this.currentBookId];
        if (!book || book.chapters.length <= 1) return;

        if (confirm('Are you sure you want to delete this chapter?')) {
            book.chapters = book.chapters.filter(c => c.id !== chapterId);
            book.lastEdited = Date.now();
            this.saveToStorage();
            this.renderChapters(book.chapters);
        }
    }

    updateChapter(chapterId, field, value) {
        if (!this.currentBookId) return;

        const book = this.books[this.currentBookId];
        if (!book) return;

        const chapter = book.chapters.find(c => c.id === chapterId);
        if (chapter) {
            chapter[field] = value;
            book.lastEdited = Date.now();
            this.saveToStorage();
        }
    }

    renderBookList() {
        const bookList = document.getElementById('bookList');
        const emptyState = document.getElementById('emptyState');

        const books = Object.values(this.books).filter(book => 
            book && book.id && book.title !== undefined && book.lastEdited
        );

        if (books.length === 0) {
            // Remove any existing book items
            const bookItems = bookList.querySelectorAll('.book-item');
            bookItems.forEach(item => item.remove());
            
            // Show the empty state that already exists in HTML
            if (emptyState) {
                emptyState.style.display = 'block';
            }
            return;
        }

        // Hide empty state when we have books
        if (emptyState) {
            emptyState.style.display = 'none';
        }

        // Sort books by last edited (most recent first)
        const sortedBooks = books.sort((a, b) => b.lastEdited - a.lastEdited);

        // Generate book items HTML
        const bookItemsHTML = sortedBooks.map(book => `
            <div class="book-item" data-book-id="${book.id}">
                <span class="book-title" data-book-id="${book.id}">${this.escapeHtml(book.title || 'Untitled Book')}</span>
                <span class="book-meta">${this.formatDate(book.lastEdited)}</span>
                <div class="book-actions">
                    <button class="btn btn-small" onclick="app.editBook('${book.id}')">Edit</button>
                    <button class="btn btn-danger btn-small" onclick="app.deleteBook('${book.id}')">Delete</button>
                </div>
            </div>
        `).join('');

        // Remove existing book items first
        const existingBookItems = bookList.querySelectorAll('.book-item');
        existingBookItems.forEach(item => item.remove());

        // Create a temporary container and add book items to it, then append to bookList
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = bookItemsHTML;
        
        // Append each book item directly to bookList
        while (tempDiv.firstChild) {
            bookList.appendChild(tempDiv.firstChild);
        }

        // Add inline editing for titles
        bookList.querySelectorAll('.book-title').forEach(titleElement => {
            titleElement.addEventListener('dblclick', (e) => {
                this.makeInlineEditable(e.target);
            });
        });
    }

    makeInlineEditable(element) {
        const bookId = element.dataset.bookId;
        const currentText = element.textContent;
        
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentText;
        input.className = 'book-title editing';
        
        element.parentNode.replaceChild(input, element);
        input.focus();
        input.select();

        const saveEdit = () => {
            const newTitle = input.value.trim() || 'Untitled Book';
            const book = this.books[bookId];
            if (book) {
                book.title = newTitle;
                book.lastEdited = Date.now();
                this.saveToStorage();
            }
            this.renderBookList();
        };

        input.addEventListener('blur', saveEdit);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                saveEdit();
            }
        });
    }

    renderChapters(chapters) {
        const chaptersContainer = document.getElementById('chapters');
        
        chaptersContainer.innerHTML = chapters.map(chapter => `
            <div class="chapter" data-chapter-id="${chapter.id}">
                <div class="chapter-header">
                    <input type="text" 
                           class="chapter-title" 
                           placeholder="Chapter title..." 
                           value="${this.escapeHtml(chapter.title)}"
                           onblur="app.updateChapter('${chapter.id}', 'title', this.value)">
                    <button class="delete-chapter" 
                            onclick="app.deleteChapter('${chapter.id}')"
                            ${chapters.length <= 1 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
                        ×
                    </button>
                </div>
                <textarea class="chapter-content" 
                          placeholder="Write your chapter content here..."
                          onblur="app.updateChapter('${chapter.id}', 'content', this.value)">${this.escapeHtml(chapter.content)}</textarea>
            </div>
        `).join('');
    }

    exportBackup() {
        // Convert object-based storage to array format for export
        const exportData = {
            books: Object.values(this.books)
        };
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `book-author-backup-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
    }

    importBackup(file) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const imported = JSON.parse(e.target.result);
                if (imported.books && Array.isArray(imported.books)) {
                    if (confirm('This will replace all your current books. Are you sure?')) {
                        // Convert array format to object-based storage
                        const newBooks = {};
                        imported.books.forEach(book => {
                            if (book.id) {
                                newBooks[book.id] = book;
                            }
                        });
                        
                        this.books = newBooks;
                        this.saveToStorage();
                        this.renderBookList();
                        alert('Backup imported successfully!');
                    }
                } else {
                    alert('Invalid backup file format.');
                }
            } catch (error) {
                alert('Error reading backup file.');
            }
        };
        reader.readAsText(file);
    }

    formatDate(timestamp) {
        if (!timestamp || isNaN(timestamp)) {
            return 'Invalid date';
        }
        
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) {
            return 'Invalid date';
        }
        
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new BookAuthor();
});
