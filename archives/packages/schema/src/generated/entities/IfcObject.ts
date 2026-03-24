import type { IfcObjectDefinition } from './IfcObjectDefinition.js';
import type { IfcLabel } from '../types/IfcLabel.js';

export interface IfcObject extends IfcObjectDefinition {
  ObjectType?: IfcLabel | null;
}
