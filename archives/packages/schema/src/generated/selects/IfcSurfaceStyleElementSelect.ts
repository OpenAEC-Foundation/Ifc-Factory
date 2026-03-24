import type { IfcExternallyDefinedSurfaceStyle } from '../entities/IfcExternallyDefinedSurfaceStyle.js';
import type { IfcSurfaceStyleLighting } from '../entities/IfcSurfaceStyleLighting.js';
import type { IfcSurfaceStyleRefraction } from '../entities/IfcSurfaceStyleRefraction.js';
import type { IfcSurfaceStyleShading } from '../entities/IfcSurfaceStyleShading.js';
import type { IfcSurfaceStyleWithTextures } from '../entities/IfcSurfaceStyleWithTextures.js';

export type IfcSurfaceStyleElementSelect = IfcExternallyDefinedSurfaceStyle | IfcSurfaceStyleLighting | IfcSurfaceStyleRefraction | IfcSurfaceStyleShading | IfcSurfaceStyleWithTextures;
