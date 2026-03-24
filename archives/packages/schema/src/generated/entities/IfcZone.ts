import type { IfcSystem } from './IfcSystem.js';
import type { IfcLabel } from '../types/IfcLabel.js';

export interface IfcZone extends IfcSystem {
  LongName?: IfcLabel | null;
}
