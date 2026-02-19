/**
 * Revision service - manages document revisions for Smart P&ID configurations.
 * Stores revision history with timestamps and descriptions.
 */
import { eventBus } from './event-bus.js';

class RevisionService {
  constructor() {
    this._revisions = [];
    this._activeRevisionId = null;
    this._restoreFromStorage();
  }

  get revisions() {
    return [...this._revisions];
  }

  get activeRevision() {
    return this._revisions.find(r => r.id === this._activeRevisionId) || null;
  }

  get activeRevisionId() {
    return this._activeRevisionId;
  }

  /**
   * Initialize with default revision if none exist
   */
  ensureDefaultRevision() {
    if (this._revisions.length === 0) {
      this._revisions.push({
        id: 'rev-001',
        name: 'Rev 0',
        label: 'A',
        description: 'Initial configuration',
        createdAt: new Date().toISOString(),
        author: 'System',
        status: 'draft'
      });
      this._activeRevisionId = 'rev-001';
      this._persist();
    }
  }

  /**
   * Create a new revision
   */
  createRevision(description = '', author = 'User') {
    const idx = this._revisions.length;
    const revNum = idx;
    const label = String.fromCharCode(65 + (idx % 26));
    const id = `rev-${String(idx + 1).padStart(3, '0')}`;

    // Mark previous active revision as 'issued'
    const prev = this.activeRevision;
    if (prev && prev.status === 'draft') {
      prev.status = 'issued';
    }

    const revision = {
      id,
      name: `Rev ${revNum}`,
      label,
      description: description || `Revision ${label}`,
      createdAt: new Date().toISOString(),
      author,
      status: 'draft'
    };

    this._revisions.push(revision);
    this._activeRevisionId = id;
    this._persist();
    eventBus.emit('revision:changed', id);
    return revision;
  }

  /**
   * Switch active revision
   */
  setActiveRevision(revisionId) {
    const rev = this._revisions.find(r => r.id === revisionId);
    if (rev) {
      this._activeRevisionId = revisionId;
      this._persist();
      eventBus.emit('revision:changed', revisionId);
    }
  }

  /**
   * Update revision description
   */
  updateRevisionDescription(revisionId, description) {
    const rev = this._revisions.find(r => r.id === revisionId);
    if (rev) {
      rev.description = description;
      this._persist();
      eventBus.emit('revision:changed', revisionId);
    }
  }

  _persist() {
    try {
      localStorage.setItem('smartpid_revisions', JSON.stringify({
        revisions: this._revisions,
        activeId: this._activeRevisionId
      }));
    } catch { /* ignore */ }
  }

  _restoreFromStorage() {
    try {
      const data = JSON.parse(localStorage.getItem('smartpid_revisions') || 'null');
      if (data && data.revisions) {
        this._revisions = data.revisions;
        this._activeRevisionId = data.activeId;
      }
    } catch { /* ignore */ }
  }
}

export const revisionService = new RevisionService();
