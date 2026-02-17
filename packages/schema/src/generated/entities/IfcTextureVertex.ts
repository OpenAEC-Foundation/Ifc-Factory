import type { IfcPresentationItem } from './IfcPresentationItem.js';
import type { IfcParameterValue } from '../types/IfcParameterValue.js';

export interface IfcTextureVertex extends IfcPresentationItem {
  Coordinates: IfcParameterValue[];
}
