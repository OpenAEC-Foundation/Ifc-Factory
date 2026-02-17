import type { IfcElementType } from './IfcElementType.js';
import type { IfcGeographicElementTypeEnum } from '../enums/IfcGeographicElementTypeEnum.js';

export interface IfcGeographicElementType extends IfcElementType {
  PredefinedType: IfcGeographicElementTypeEnum;
}
