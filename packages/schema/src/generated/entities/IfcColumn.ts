import type { IfcBuiltElement } from './IfcBuiltElement.js';
import type { IfcColumnTypeEnum } from '../enums/IfcColumnTypeEnum.js';

export interface IfcColumn extends IfcBuiltElement {
  PredefinedType?: IfcColumnTypeEnum | null;
}
