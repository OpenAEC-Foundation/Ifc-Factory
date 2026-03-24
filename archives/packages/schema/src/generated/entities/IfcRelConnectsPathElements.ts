import type { IfcRelConnectsElements } from './IfcRelConnectsElements.js';
import type { IfcInteger } from '../types/IfcInteger.js';
import type { IfcConnectionTypeEnum } from '../enums/IfcConnectionTypeEnum.js';

export interface IfcRelConnectsPathElements extends IfcRelConnectsElements {
  RelatingPriorities: IfcInteger[];
  RelatedPriorities: IfcInteger[];
  RelatedConnectionType: IfcConnectionTypeEnum;
  RelatingConnectionType: IfcConnectionTypeEnum;
}
