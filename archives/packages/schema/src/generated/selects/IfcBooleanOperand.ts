import type { IfcBooleanResult } from '../entities/IfcBooleanResult.js';
import type { IfcCsgPrimitive3D } from '../entities/IfcCsgPrimitive3D.js';
import type { IfcHalfSpaceSolid } from '../entities/IfcHalfSpaceSolid.js';
import type { IfcSolidModel } from '../entities/IfcSolidModel.js';
import type { IfcTessellatedFaceSet } from '../entities/IfcTessellatedFaceSet.js';

export type IfcBooleanOperand = IfcBooleanResult | IfcCsgPrimitive3D | IfcHalfSpaceSolid | IfcSolidModel | IfcTessellatedFaceSet;
