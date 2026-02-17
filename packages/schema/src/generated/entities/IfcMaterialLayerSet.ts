import type { IfcMaterialDefinition } from './IfcMaterialDefinition.js';
import type { IfcMaterialLayer } from './IfcMaterialLayer.js';
import type { IfcLabel } from '../types/IfcLabel.js';
import type { IfcText } from '../types/IfcText.js';

export interface IfcMaterialLayerSet extends IfcMaterialDefinition {
  MaterialLayers: IfcMaterialLayer[];
  LayerSetName?: IfcLabel | null;
  Description?: IfcText | null;
}
