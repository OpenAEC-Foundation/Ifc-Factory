import type { IfcBuiltElementType } from './IfcBuiltElementType.js';
import type { IfcNavigationElementTypeEnum } from '../enums/IfcNavigationElementTypeEnum.js';

export interface IfcNavigationElementType extends IfcBuiltElementType {
  PredefinedType: IfcNavigationElementTypeEnum;
}
