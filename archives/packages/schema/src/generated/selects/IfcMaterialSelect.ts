import type { IfcMaterialDefinition } from '../entities/IfcMaterialDefinition.js';
import type { IfcMaterialList } from '../entities/IfcMaterialList.js';
import type { IfcMaterialUsageDefinition } from '../entities/IfcMaterialUsageDefinition.js';

export type IfcMaterialSelect = IfcMaterialDefinition | IfcMaterialList | IfcMaterialUsageDefinition;
