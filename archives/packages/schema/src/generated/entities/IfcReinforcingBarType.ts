import type { IfcReinforcingElementType } from './IfcReinforcingElementType.js';
import type { IfcReinforcingBarTypeEnum } from '../enums/IfcReinforcingBarTypeEnum.js';
import type { IfcPositiveLengthMeasure } from '../types/IfcPositiveLengthMeasure.js';
import type { IfcAreaMeasure } from '../types/IfcAreaMeasure.js';
import type { IfcReinforcingBarSurfaceEnum } from '../enums/IfcReinforcingBarSurfaceEnum.js';
import type { IfcLabel } from '../types/IfcLabel.js';
import type { IfcBendingParameterSelect } from '../selects/IfcBendingParameterSelect.js';

export interface IfcReinforcingBarType extends IfcReinforcingElementType {
  PredefinedType: IfcReinforcingBarTypeEnum;
  NominalDiameter?: IfcPositiveLengthMeasure | null;
  CrossSectionArea?: IfcAreaMeasure | null;
  BarLength?: IfcPositiveLengthMeasure | null;
  BarSurface?: IfcReinforcingBarSurfaceEnum | null;
  BendingShapeCode?: IfcLabel | null;
  BendingParameters?: IfcBendingParameterSelect[] | null;
}
