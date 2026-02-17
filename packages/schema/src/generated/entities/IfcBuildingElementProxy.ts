import type { IfcBuiltElement } from './IfcBuiltElement.js';
import type { IfcBuildingElementProxyTypeEnum } from '../enums/IfcBuildingElementProxyTypeEnum.js';

export interface IfcBuildingElementProxy extends IfcBuiltElement {
  PredefinedType?: IfcBuildingElementProxyTypeEnum | null;
}
