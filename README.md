# BookAuthor

A simple book authoring tool that runs in the browser. Write books with multiple chapters, edit content, and track your writing history.

## Features

- **Write Books**: Create multiple books with chapters
- **Edit Content**: Rich text editing for chapters and titles
- **Auto-backup**: Automatic change history every minute of inactivity
- **Local Storage**: All content saved locally in your browser
- **History**: Restore previous versions of your work

## Getting Started

1. Open `index.html` in your browser
2. Click "New Book" to start writing
3. Add chapters and content
4. Everything saves automatically

## Testing

Comprehensive end-to-end tests with Playwright:

```bash
npm install
npm test
```

**44 tests** covering all functionality including book creation, editing, chapter management, and history traversal.
