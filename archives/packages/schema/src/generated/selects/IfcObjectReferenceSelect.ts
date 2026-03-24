import type { IfcAddress } from '../entities/IfcAddress.js';
import type { IfcAppliedValue } from '../entities/IfcAppliedValue.js';
import type { IfcExternalReference } from '../entities/IfcExternalReference.js';
import type { IfcMaterialDefinition } from '../entities/IfcMaterialDefinition.js';
import type { IfcOrganization } from '../entities/IfcOrganization.js';
import type { IfcPerson } from '../entities/IfcPerson.js';
import type { IfcPersonAndOrganization } from '../entities/IfcPersonAndOrganization.js';
import type { IfcTable } from '../entities/IfcTable.js';
import type { IfcTimeSeries } from '../entities/IfcTimeSeries.js';

export type IfcObjectReferenceSelect = IfcAddress | IfcAppliedValue | IfcExternalReference | IfcMaterialDefinition | IfcOrganization | IfcPerson | IfcPersonAndOrganization | IfcTable | IfcTimeSeries;
