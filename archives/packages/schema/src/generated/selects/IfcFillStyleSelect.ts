import type { IfcColour } from './IfcColour.js';
import type { IfcExternallyDefinedHatchStyle } from '../entities/IfcExternallyDefinedHatchStyle.js';
import type { IfcFillAreaStyleHatching } from '../entities/IfcFillAreaStyleHatching.js';
import type { IfcFillAreaStyleTiles } from '../entities/IfcFillAreaStyleTiles.js';

export type IfcFillStyleSelect = IfcColour | IfcExternallyDefinedHatchStyle | IfcFillAreaStyleHatching | IfcFillAreaStyleTiles;
