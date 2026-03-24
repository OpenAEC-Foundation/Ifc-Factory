import type { IfcDescriptiveMeasure } from '../types/IfcDescriptiveMeasure.js';
import type { IfcLengthMeasure } from '../types/IfcLengthMeasure.js';
import type { IfcNormalisedRatioMeasure } from '../types/IfcNormalisedRatioMeasure.js';
import type { IfcPositiveLengthMeasure } from '../types/IfcPositiveLengthMeasure.js';
import type { IfcPositiveRatioMeasure } from '../types/IfcPositiveRatioMeasure.js';
import type { IfcRatioMeasure } from '../types/IfcRatioMeasure.js';

export type IfcSizeSelect = IfcDescriptiveMeasure | IfcLengthMeasure | IfcNormalisedRatioMeasure | IfcPositiveLengthMeasure | IfcPositiveRatioMeasure | IfcRatioMeasure;
