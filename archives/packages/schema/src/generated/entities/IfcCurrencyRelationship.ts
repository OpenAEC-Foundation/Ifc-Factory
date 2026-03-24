import type { IfcResourceLevelRelationship } from './IfcResourceLevelRelationship.js';
import type { IfcMonetaryUnit } from './IfcMonetaryUnit.js';
import type { IfcPositiveRatioMeasure } from '../types/IfcPositiveRatioMeasure.js';
import type { IfcDateTime } from '../types/IfcDateTime.js';
import type { IfcLibraryInformation } from './IfcLibraryInformation.js';

export interface IfcCurrencyRelationship extends IfcResourceLevelRelationship {
  RelatingMonetaryUnit: IfcMonetaryUnit;
  RelatedMonetaryUnit: IfcMonetaryUnit;
  ExchangeRate: IfcPositiveRatioMeasure;
  RateDateTime?: IfcDateTime | null;
  RateSource?: IfcLibraryInformation | null;
}
