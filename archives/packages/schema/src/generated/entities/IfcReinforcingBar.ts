import type { IfcReinforcingElement } from './IfcReinforcingElement.js';
import type { IfcPositiveLengthMeasure } from '../types/IfcPositiveLengthMeasure.js';
import type { IfcAreaMeasure } from '../types/IfcAreaMeasure.js';
import type { IfcReinforcingBarTypeEnum } from '../enums/IfcReinforcingBarTypeEnum.js';
import type { IfcReinforcingBarSurfaceEnum } from '../enums/IfcReinforcingBarSurfaceEnum.js';

export interface IfcReinforcingBar extends IfcReinforcingElement {
  NominalDiameter?: IfcPositiveLengthMeasure | null;
  CrossSectionArea?: IfcAreaMeasure | null;
  BarLength?: IfcPositiveLengthMeasure | null;
  PredefinedType?: IfcReinforcingBarTypeEnum | null;
  BarSurface?: IfcReinforcingBarSurfaceEnum | null;
}
