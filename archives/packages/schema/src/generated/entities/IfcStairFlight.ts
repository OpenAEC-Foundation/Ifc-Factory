import type { IfcBuiltElement } from './IfcBuiltElement.js';
import type { IfcInteger } from '../types/IfcInteger.js';
import type { IfcPositiveLengthMeasure } from '../types/IfcPositiveLengthMeasure.js';
import type { IfcStairFlightTypeEnum } from '../enums/IfcStairFlightTypeEnum.js';

export interface IfcStairFlight extends IfcBuiltElement {
  NumberOfRisers?: IfcInteger | null;
  NumberOfTreads?: IfcInteger | null;
  RiserHeight?: IfcPositiveLengthMeasure | null;
  TreadLength?: IfcPositiveLengthMeasure | null;
  PredefinedType?: IfcStairFlightTypeEnum | null;
}
