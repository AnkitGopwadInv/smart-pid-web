/**
 * Sidebar component - workflow step navigation
 * Port of Views/MainPaletteView.xaml (sidebar section)
 */
import { el } from '../utils/dom.js';
import { Screen, navigationService } from '../services/navigation-service.js';
import { eventBus } from '../services/event-bus.js';
import { defaultWorkflowSteps } from '../models/workflow-step.js';

export class Sidebar {
  constructor() {
    this._steps = defaultWorkflowSteps.map(s => ({ ...s }));
    this._container = null;
    this._stepsContainer = null;
  }

  /**
   * Render sidebar into container
   * @param {HTMLElement} container
   */
  render(container) {
    this._container = container;
    container.innerHTML = '';

    // Header
    const header = el('div', {
      style: { padding: '24px 16px 16px', }
    },
      el('div', {
        style: {
          fontSize: '11px',
          fontWeight: '600',
          color: 'var(--sidebar-title)',
          letterSpacing: '0.5px'
        }
      }, 'WORKFLOW STEPS')
    );

    // Steps
    this._stepsContainer = el('div', { style: { padding: '0 8px 16px' } });
    this._renderSteps();

    container.append(header, this._stepsContainer);

    // Listen for screen changes
    eventBus.on('screen:changed', (screen) => this._onScreenChanged(screen));
  }

  _renderSteps() {
    this._stepsContainer.innerHTML = '';

    for (const step of this._steps) {
      const stepEl = this._createStepElement(step);
      this._stepsContainer.appendChild(stepEl);
    }
  }

  _createStepElement(step) {
    // Circle
    let circleBg = 'var(--sidebar-number-bg)';
    let circleColor = 'var(--text-primary)';
    let circleContent = String(step.stepNumber);

    if (step.isCompleted) {
      circleBg = 'var(--sidebar-number-completed)';
      circleColor = 'white';
      circleContent = '\u2713';
    } else if (step.isActive) {
      circleBg = 'var(--sidebar-number-active)';
      circleColor = 'white';
    }

    const circle = el('div', {
      style: {
        width: '28px',
        height: '28px',
        borderRadius: '14px',
        background: circleBg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '12px',
        fontWeight: '600',
        color: circleColor,
        marginRight: '12px',
        flexShrink: '0'
      }
    }, circleContent);

    // Label
    const label = el('span', {
      style: { fontSize: '14px', color: 'var(--text-primary)', flex: '1' }
    }, step.label);

    // Check mark (completed)
    const check = step.isCompleted
      ? el('span', { style: { fontSize: '14px', fontWeight: 'bold', color: 'var(--sidebar-check)' } }, '\u2713')
      : null;

    // Button container
    const btn = el('button', {
      style: {
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        padding: '10px 12px',
        margin: '2px 0',
        border: 'none',
        borderRadius: '8px',
        background: step.isActive ? 'var(--sidebar-item-active)' : 'transparent',
        cursor: step.isNavigable ? 'pointer' : 'default',
        opacity: step.isNavigable ? '1' : '0.6',
        transition: 'background 150ms ease'
      },
      disabled: step.isNavigable ? undefined : 'disabled',
      onClick: () => {
        if (step.isNavigable) {
          navigationService.navigateTo(step.screen);
        }
      },
      onMouseenter: (e) => {
        if (step.isNavigable && !step.isActive) {
          e.currentTarget.style.background = 'var(--sidebar-item-hover)';
        }
      },
      onMouseleave: (e) => {
        e.currentTarget.style.background = step.isActive ? 'var(--sidebar-item-active)' : 'transparent';
      }
    }, circle, label, check);

    return btn;
  }

  _onScreenChanged(screen) {
    const screenOrder = [
      Screen.DivisionSelection,
      Screen.ProductSelection,
      Screen.PfdBlockSelection,
      Screen.MainHub,
      Screen.BlockConfiguration
    ];

    const currentIdx = screenOrder.indexOf(screen);

    for (let i = 0; i < this._steps.length; i++) {
      this._steps[i].isActive = i === currentIdx;
      this._steps[i].isCompleted = i < currentIdx;
    }

    this._renderSteps();
  }
}
