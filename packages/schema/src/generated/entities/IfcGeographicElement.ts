import type { IfcElement } from './IfcElement.js';
import type { IfcGeographicElementTypeEnum } from '../enums/IfcGeographicElementTypeEnum.js';

export interface IfcGeographicElement extends IfcElement {
  PredefinedType?: IfcGeographicElementTypeEnum | null;
}
