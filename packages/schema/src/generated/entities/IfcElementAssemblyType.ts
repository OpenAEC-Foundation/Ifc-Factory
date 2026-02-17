import type { IfcElementType } from './IfcElementType.js';
import type { IfcElementAssemblyTypeEnum } from '../enums/IfcElementAssemblyTypeEnum.js';

export interface IfcElementAssemblyType extends IfcElementType {
  PredefinedType: IfcElementAssemblyTypeEnum;
}
