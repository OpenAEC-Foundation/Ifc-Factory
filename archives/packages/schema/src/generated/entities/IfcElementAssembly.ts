import type { IfcElement } from './IfcElement.js';
import type { IfcAssemblyPlaceEnum } from '../enums/IfcAssemblyPlaceEnum.js';
import type { IfcElementAssemblyTypeEnum } from '../enums/IfcElementAssemblyTypeEnum.js';

export interface IfcElementAssembly extends IfcElement {
  AssemblyPlace?: IfcAssemblyPlaceEnum | null;
  PredefinedType?: IfcElementAssemblyTypeEnum | null;
}
