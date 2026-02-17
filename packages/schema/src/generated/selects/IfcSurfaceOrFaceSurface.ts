import type { IfcFaceBasedSurfaceModel } from '../entities/IfcFaceBasedSurfaceModel.js';
import type { IfcFaceSurface } from '../entities/IfcFaceSurface.js';
import type { IfcSurface } from '../entities/IfcSurface.js';

export type IfcSurfaceOrFaceSurface = IfcFaceBasedSurfaceModel | IfcFaceSurface | IfcSurface;
