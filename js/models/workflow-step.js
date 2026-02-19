/**
 * Workflow step model for sidebar navigation
 */
import { Screen } from '../services/navigation-service.js';

export class WorkflowStep {
  constructor({ stepNumber, label, screen, isActive = false, isCompleted = false }) {
    this.stepNumber = stepNumber;
    this.label = label;
    this.screen = screen;
    this.isActive = isActive;
    this.isCompleted = isCompleted;
  }

  get isNavigable() {
    return this.isCompleted || this.isActive;
  }
}

/**
 * Default workflow steps
 */
export const defaultWorkflowSteps = [
  new WorkflowStep({ stepNumber: 1, label: 'Division', screen: Screen.DivisionSelection, isActive: true }),
  new WorkflowStep({ stepNumber: 2, label: 'Product', screen: Screen.ProductSelection }),
  new WorkflowStep({ stepNumber: 3, label: 'PFD Blocks', screen: Screen.PfdBlockSelection }),
  new WorkflowStep({ stepNumber: 4, label: 'Configure', screen: Screen.MainHub }),
  new WorkflowStep({ stepNumber: 5, label: 'Block Config', screen: Screen.BlockConfiguration })
];
