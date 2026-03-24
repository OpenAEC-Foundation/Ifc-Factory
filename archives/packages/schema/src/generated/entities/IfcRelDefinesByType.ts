import type { IfcRelDefines } from './IfcRelDefines.js';
import type { IfcObject } from './IfcObject.js';
import type { IfcTypeObject } from './IfcTypeObject.js';

export interface IfcRelDefinesByType extends IfcRelDefines {
  RelatedObjects: IfcObject[];
  RelatingType: IfcTypeObject;
}
