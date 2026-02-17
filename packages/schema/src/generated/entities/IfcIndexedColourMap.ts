import type { IfcPresentationItem } from './IfcPresentationItem.js';
import type { IfcTessellatedFaceSet } from './IfcTessellatedFaceSet.js';
import type { IfcNormalisedRatioMeasure } from '../types/IfcNormalisedRatioMeasure.js';
import type { IfcColourRgbList } from './IfcColourRgbList.js';
import type { IfcPositiveInteger } from '../types/IfcPositiveInteger.js';

export interface IfcIndexedColourMap extends IfcPresentationItem {
  MappedTo: IfcTessellatedFaceSet;
  Opacity?: IfcNormalisedRatioMeasure | null;
  Colours: IfcColourRgbList;
  ColourIndex: IfcPositiveInteger[];
}
