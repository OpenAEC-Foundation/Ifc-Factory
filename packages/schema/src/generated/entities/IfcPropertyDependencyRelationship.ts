import type { IfcResourceLevelRelationship } from './IfcResourceLevelRelationship.js';
import type { IfcProperty } from './IfcProperty.js';
import type { IfcText } from '../types/IfcText.js';

export interface IfcPropertyDependencyRelationship extends IfcResourceLevelRelationship {
  DependingProperty: IfcProperty;
  DependantProperty: IfcProperty;
  Expression?: IfcText | null;
}
