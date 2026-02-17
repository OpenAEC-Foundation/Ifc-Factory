import type { IfcPreDefinedProperties } from './IfcPreDefinedProperties.js';
import type { IfcAreaMeasure } from '../types/IfcAreaMeasure.js';
import type { IfcLabel } from '../types/IfcLabel.js';
import type { IfcReinforcingBarSurfaceEnum } from '../enums/IfcReinforcingBarSurfaceEnum.js';
import type { IfcLengthMeasure } from '../types/IfcLengthMeasure.js';
import type { IfcPositiveLengthMeasure } from '../types/IfcPositiveLengthMeasure.js';
import type { IfcCountMeasure } from '../types/IfcCountMeasure.js';

export interface IfcReinforcementBarProperties extends IfcPreDefinedProperties {
  TotalCrossSectionArea: IfcAreaMeasure;
  SteelGrade: IfcLabel;
  BarSurface?: IfcReinforcingBarSurfaceEnum | null;
  EffectiveDepth?: IfcLengthMeasure | null;
  NominalBarDiameter?: IfcPositiveLengthMeasure | null;
  BarCount?: IfcCountMeasure | null;
}
