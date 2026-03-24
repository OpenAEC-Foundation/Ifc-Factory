import type { IfcPresentationItem } from './IfcPresentationItem.js';
import type { IfcNormalisedRatioMeasure } from '../types/IfcNormalisedRatioMeasure.js';

export interface IfcColourRgbList extends IfcPresentationItem {
  ColourList: IfcNormalisedRatioMeasure[][];
}
