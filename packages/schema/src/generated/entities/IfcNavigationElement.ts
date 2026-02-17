import type { IfcBuiltElement } from './IfcBuiltElement.js';
import type { IfcNavigationElementTypeEnum } from '../enums/IfcNavigationElementTypeEnum.js';

export interface IfcNavigationElement extends IfcBuiltElement {
  PredefinedType?: IfcNavigationElementTypeEnum | null;
}
