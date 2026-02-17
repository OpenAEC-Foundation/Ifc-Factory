import type { IfcElementComponent } from './IfcElementComponent.js';
import type { IfcDiscreteAccessoryTypeEnum } from '../enums/IfcDiscreteAccessoryTypeEnum.js';

export interface IfcDiscreteAccessory extends IfcElementComponent {
  PredefinedType?: IfcDiscreteAccessoryTypeEnum | null;
}
