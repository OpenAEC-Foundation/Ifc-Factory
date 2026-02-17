import type { IfcRelConnectsElements } from './IfcRelConnectsElements.js';
import type { IfcElement } from './IfcElement.js';
import type { IfcLabel } from '../types/IfcLabel.js';

export interface IfcRelConnectsWithRealizingElements extends IfcRelConnectsElements {
  RealizingElements: IfcElement[];
  ConnectionType?: IfcLabel | null;
}
