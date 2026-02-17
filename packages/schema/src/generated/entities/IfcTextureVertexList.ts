import type { IfcPresentationItem } from './IfcPresentationItem.js';
import type { IfcParameterValue } from '../types/IfcParameterValue.js';

export interface IfcTextureVertexList extends IfcPresentationItem {
  TexCoordsList: IfcParameterValue[][];
}
