import { Page, Locator } from '@playwright/test'

import { BasePage } from './BasePage'

/**
 * Page Object for Notes page
 */
export class NotesPage extends BasePage {
  // Locators
  readonly newNoteButton: Locator
  readonly noteTitleInput: Locator
  readonly noteContentInput: Locator
  readonly saveButton: Locator
  readonly searchInput: Locator
  readonly noteList: Locator
  readonly sidebar: Locator
  readonly commandPalette: Locator

  constructor(page: Page) {
    super(page, '/')

    // Initialize locators
    this.newNoteButton = page.getByRole('button', { name: /nouvelle note|new note/i })
    this.noteTitleInput = page.getByPlaceholder(/titre|title/i)
    this.noteContentInput = page.locator('.cm-editor, [contenteditable="true"]').first()
    this.saveButton = page.getByRole('button', { name: /sauvegarder|save/i })
    this.searchInput = page.getByPlaceholder(/rechercher|search/i)
    this.noteList = page.locator('[data-testid="note-list"], .note-list')
    this.sidebar = page.locator('[data-testid="sidebar"], aside')
    this.commandPalette = page.locator('[data-testid="command-palette"], [cmdk-root]')
  }

  /**
   * Create a new note
   */
  async createNote(title: string, content: string): Promise<void> {
    await this.newNoteButton.click()
    await this.noteTitleInput.fill(title)
    await this.noteContentInput.fill(content)
    await this.saveButton.click()
  }

  /**
   * Search for a note
   */
  async searchNotes(query: string): Promise<void> {
    await this.searchInput.fill(query)
    await this.page.waitForTimeout(300) // Wait for debounce
  }

  /**
   * Open command palette
   */
  async openCommandPalette(): Promise<void> {
    await this.page.keyboard.press('Control+k')
    await this.commandPalette.waitFor({ state: 'visible' })
  }

  /**
   * Get note count in list
   */
  async getNoteCount(): Promise<number> {
    return this.noteList.locator('> *').count()
  }

  /**
   * Click on a note by title
   */
  async clickNoteByTitle(title: string): Promise<void> {
    await this.noteList.getByText(title).click()
  }

  /**
   * Toggle sidebar
   */
  async toggleSidebar(): Promise<void> {
    await this.page.keyboard.press('Control+b')
  }

  /**
   * Wait for note to appear in list
   */
  async waitForNoteInList(title: string): Promise<void> {
    await this.noteList.getByText(title).waitFor({ state: 'visible' })
  }
}
