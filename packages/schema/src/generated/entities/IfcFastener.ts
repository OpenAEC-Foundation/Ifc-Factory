import type { IfcElementComponent } from './IfcElementComponent.js';
import type { IfcFastenerTypeEnum } from '../enums/IfcFastenerTypeEnum.js';

export interface IfcFastener extends IfcElementComponent {
  PredefinedType?: IfcFastenerTypeEnum | null;
}
