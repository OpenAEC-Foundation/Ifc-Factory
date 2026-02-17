import type { IfcBuiltElementType } from './IfcBuiltElementType.js';
import type { IfcBuildingElementProxyTypeEnum } from '../enums/IfcBuildingElementProxyTypeEnum.js';

export interface IfcBuildingElementProxyType extends IfcBuiltElementType {
  PredefinedType: IfcBuildingElementProxyTypeEnum;
}
