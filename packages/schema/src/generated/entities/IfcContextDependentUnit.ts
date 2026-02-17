import type { IfcNamedUnit } from './IfcNamedUnit.js';
import type { IfcLabel } from '../types/IfcLabel.js';

export interface IfcContextDependentUnit extends IfcNamedUnit {
  Name: IfcLabel;
}
