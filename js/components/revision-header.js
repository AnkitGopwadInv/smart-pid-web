/**
 * Revision header component - renders revision selector/info in the app header.
 * Includes a proper modal for creating new revisions.
 */
import { el } from '../utils/dom.js';
import { revisionService } from '../services/revision-service.js';
import { eventBus } from '../services/event-bus.js';

export class RevisionHeader {
  constructor() {
    this._container = null;
    this._dropdownOpen = false;
    this._dropdownEl = null;
    this._modalOverlay = null;
  }

  render(container) {
    this._container = container;
    revisionService.ensureDefaultRevision();
    this._rebuild();

    eventBus.on('revision:changed', () => this._rebuild());

    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
      if (this._dropdownOpen && this._container && !this._container.contains(e.target)) {
        this._closeDropdown();
      }
    });
  }

  _rebuild() {
    this._container.innerHTML = '';
    const active = revisionService.activeRevision;
    if (!active) return;

    const statusClass = active.status === 'draft' ? 'draft' : 'issued';

    // Current revision badge (clickable)
    const revBadge = el('div', {
      className: 'rev-badge',
      onClick: (e) => { e.stopPropagation(); this._toggleDropdown(); }
    },
      el('span', { className: 'rev-badge-label' }, active.label),
      el('div', { className: 'rev-badge-info' },
        el('span', { className: 'rev-badge-name' }, active.name),
        el('span', { className: `rev-badge-status ${statusClass}` }, active.status)
      ),
      el('span', { className: 'rev-badge-arrow' }, '\u25BE')
    );

    // New revision button
    const newRevBtn = el('button', {
      className: 'rev-new-btn',
      title: 'Create new revision',
      onClick: (e) => { e.stopPropagation(); this._openNewRevisionModal(); }
    }, '+ New Rev');

    // Dropdown (hidden by default)
    this._dropdownEl = el('div', { className: 'rev-dropdown' });
    this._dropdownEl.style.display = 'none';

    this._container.append(revBadge, newRevBtn, this._dropdownEl);
  }

  _toggleDropdown() {
    if (this._dropdownOpen) {
      this._closeDropdown();
    } else {
      this._openDropdown();
    }
  }

  _openDropdown() {
    this._dropdownOpen = true;
    this._dropdownEl.style.display = 'block';
    this._renderDropdownContent();
  }

  _closeDropdown() {
    this._dropdownOpen = false;
    if (this._dropdownEl) this._dropdownEl.style.display = 'none';
  }

  _renderDropdownContent() {
    this._dropdownEl.innerHTML = '';
    const revisions = revisionService.revisions;
    const activeId = revisionService.activeRevisionId;

    // Header
    this._dropdownEl.appendChild(
      el('div', { className: 'rev-dropdown-header' },
        el('span', {}, 'Revision History'),
        el('span', { className: 'rev-dropdown-count' }, `${revisions.length} revision${revisions.length > 1 ? 's' : ''}`)
      )
    );

    // Revision list
    const list = el('div', { className: 'rev-dropdown-list' });
    for (let i = revisions.length - 1; i >= 0; i--) {
      const rev = revisions[i];
      const isActive = rev.id === activeId;
      const statusClass = rev.status === 'draft' ? 'draft' : 'issued';
      const date = new Date(rev.createdAt);
      const dateStr = `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

      const item = el('div', {
        className: `rev-dropdown-item${isActive ? ' active' : ''}`,
        onClick: (e) => {
          e.stopPropagation();
          revisionService.setActiveRevision(rev.id);
          this._closeDropdown();
        }
      },
        el('div', { className: 'rev-dropdown-item-left' },
          el('div', { className: 'rev-dropdown-item-circle' }, rev.label),
          el('div', { className: 'rev-dropdown-item-info' },
            el('div', { className: 'rev-dropdown-item-name' },
              rev.name,
              el('span', { className: `rev-mini-status ${statusClass}` }, rev.status)
            ),
            el('div', { className: 'rev-dropdown-item-desc' }, rev.description),
            el('div', { className: 'rev-dropdown-item-meta' },
              el('span', {}, rev.author),
              el('span', { className: 'rev-meta-dot' }, '\u00B7'),
              el('span', {}, dateStr)
            )
          )
        ),
        isActive ? el('span', { className: 'rev-dropdown-item-check' }, '\u2713') : null
      );

      list.appendChild(item);
    }

    this._dropdownEl.appendChild(list);
  }

  // ─── New Revision Modal ───

  _openNewRevisionModal() {
    this._closeDropdown();

    const revisions = revisionService.revisions;
    const nextIdx = revisions.length;
    const nextLabel = String.fromCharCode(65 + (nextIdx % 26));
    const nextName = `Rev ${nextIdx}`;

    // Build modal
    let descInput, authorInput;

    const overlay = el('div', { className: 'rev-modal-overlay', onClick: (e) => {
      if (e.target === overlay) this._closeModal();
    }},
      el('div', { className: 'rev-modal' },
        // Header
        el('div', { className: 'rev-modal-header' },
          el('div', { className: 'rev-modal-header-left' },
            el('div', { className: 'rev-modal-icon' }, nextLabel),
            el('div', {},
              el('h2', { className: 'rev-modal-title' }, 'Create New Revision'),
              el('p', { className: 'rev-modal-subtitle' }, `This will create ${nextName} and mark the current revision as issued.`)
            )
          ),
          el('button', { className: 'rev-modal-close', onClick: () => this._closeModal() }, '\u2715')
        ),
        // Body
        el('div', { className: 'rev-modal-body' },
          el('div', { className: 'rev-modal-field' },
            el('label', { className: 'rev-modal-label' }, 'Revision Name'),
            el('div', { className: 'rev-modal-static' }, nextName)
          ),
          el('div', { className: 'rev-modal-field' },
            el('label', { className: 'rev-modal-label', htmlFor: 'rev-desc' }, 'Description'),
            descInput = el('textarea', {
              className: 'rev-modal-input rev-modal-textarea',
              id: 'rev-desc',
              placeholder: 'e.g. Updated instrument list, added safety valves...',
              rows: '3'
            })
          ),
          el('div', { className: 'rev-modal-field' },
            el('label', { className: 'rev-modal-label', htmlFor: 'rev-author' }, 'Author'),
            authorInput = el('input', {
              className: 'rev-modal-input',
              id: 'rev-author',
              type: 'text',
              placeholder: 'Your name',
              value: 'User'
            })
          ),
          // Info box
          el('div', { className: 'rev-modal-info' },
            el('span', { className: 'rev-modal-info-icon' }, '\u24D8'),
            el('span', {}, 'The current active revision will be marked as "Issued" and a new draft revision will be created.')
          )
        ),
        // Footer
        el('div', { className: 'rev-modal-footer' },
          el('button', { className: 'btn btn-secondary', onClick: () => this._closeModal() }, 'Cancel'),
          el('button', { className: 'btn btn-primary', onClick: () => {
            const desc = descInput.value.trim();
            const author = authorInput.value.trim() || 'User';
            this._createRevision(desc, author);
          }}, 'Create Revision')
        )
      )
    );

    this._modalOverlay = overlay;
    document.body.appendChild(overlay);

    // Focus description input
    setTimeout(() => descInput.focus(), 50);
  }

  _createRevision(description, author) {
    revisionService.createRevision(description, author);
    this._closeModal();
  }

  _closeModal() {
    if (this._modalOverlay) {
      this._modalOverlay.remove();
      this._modalOverlay = null;
    }
  }
}
