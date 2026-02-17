import type { IfcElementComponent } from './IfcElementComponent.js';
import type { IfcBuildingElementPartTypeEnum } from '../enums/IfcBuildingElementPartTypeEnum.js';

export interface IfcBuildingElementPart extends IfcElementComponent {
  PredefinedType?: IfcBuildingElementPartTypeEnum | null;
}
