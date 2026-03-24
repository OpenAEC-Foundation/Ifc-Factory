import type { IfcRelAssociates } from './IfcRelAssociates.js';
import type { IfcLabel } from '../types/IfcLabel.js';
import type { IfcConstraint } from './IfcConstraint.js';

export interface IfcRelAssociatesConstraint extends IfcRelAssociates {
  Intent?: IfcLabel | null;
  RelatingConstraint: IfcConstraint;
}
