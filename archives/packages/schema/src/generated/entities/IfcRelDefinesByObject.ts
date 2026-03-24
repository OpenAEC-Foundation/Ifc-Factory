import type { IfcRelDefines } from './IfcRelDefines.js';
import type { IfcObject } from './IfcObject.js';

export interface IfcRelDefinesByObject extends IfcRelDefines {
  RelatedObjects: IfcObject[];
  RelatingObject: IfcObject;
}
