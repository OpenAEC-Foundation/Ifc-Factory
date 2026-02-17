import type { IfcPositioningElement } from './IfcPositioningElement.js';
import type { IfcGridAxis } from './IfcGridAxis.js';
import type { IfcGridTypeEnum } from '../enums/IfcGridTypeEnum.js';

export interface IfcGrid extends IfcPositioningElement {
  UAxes: IfcGridAxis[];
  VAxes: IfcGridAxis[];
  WAxes?: IfcGridAxis[] | null;
  PredefinedType?: IfcGridTypeEnum | null;
}
