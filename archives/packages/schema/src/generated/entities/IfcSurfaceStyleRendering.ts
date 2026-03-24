import type { IfcSurfaceStyleShading } from './IfcSurfaceStyleShading.js';
import type { IfcColourOrFactor } from '../selects/IfcColourOrFactor.js';
import type { IfcSpecularHighlightSelect } from '../selects/IfcSpecularHighlightSelect.js';
import type { IfcReflectanceMethodEnum } from '../enums/IfcReflectanceMethodEnum.js';

export interface IfcSurfaceStyleRendering extends IfcSurfaceStyleShading {
  DiffuseColour?: IfcColourOrFactor | null;
  TransmissionColour?: IfcColourOrFactor | null;
  DiffuseTransmissionColour?: IfcColourOrFactor | null;
  ReflectionColour?: IfcColourOrFactor | null;
  SpecularColour?: IfcColourOrFactor | null;
  SpecularHighlight?: IfcSpecularHighlightSelect | null;
  ReflectanceMethod: IfcReflectanceMethodEnum;
}
