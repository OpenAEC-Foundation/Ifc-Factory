import type { IfcElementComponent } from './IfcElementComponent.js';
import type { IfcLabel } from '../types/IfcLabel.js';

export interface IfcReinforcingElement extends IfcElementComponent {
  SteelGrade?: IfcLabel | null;
}
