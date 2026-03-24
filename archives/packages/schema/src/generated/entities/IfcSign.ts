import type { IfcElementComponent } from './IfcElementComponent.js';
import type { IfcSignTypeEnum } from '../enums/IfcSignTypeEnum.js';

export interface IfcSign extends IfcElementComponent {
  PredefinedType?: IfcSignTypeEnum | null;
}
