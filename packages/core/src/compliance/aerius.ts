import type { IfcModel } from '../model/ifc-model.js';
import { createPropertySet, assignPropertySet, type PropertyValue } from '../helpers/properties.js';

export function createAeriusPropertySet(
  model: IfcModel,
  elementIds: number[],
  properties: {
    stikstofEmissie?: number;
    stikstofDepositie?: number;
    projectId?: string;
    calculationId?: string;
    sector?: string;
  },
): void {
  const props: PropertyValue[] = [];

  if (properties.stikstofEmissie !== undefined) {
    props.push({ name: 'StikstofEmissie', value: properties.stikstofEmissie, type: 'IFCREAL' });
  }
  if (properties.stikstofDepositie !== undefined) {
    props.push({ name: 'StikstofDepositie', value: properties.stikstofDepositie, type: 'IFCREAL' });
  }
  if (properties.projectId !== undefined) {
    props.push({ name: 'AeriusProjectId', value: properties.projectId, type: 'IFCLABEL' });
  }
  if (properties.calculationId !== undefined) {
    props.push({ name: 'AeriusCalculationId', value: properties.calculationId, type: 'IFCLABEL' });
  }
  if (properties.sector !== undefined) {
    props.push({ name: 'Sector', value: properties.sector, type: 'IFCLABEL' });
  }

  if (props.length > 0) {
    const pset = createPropertySet(model, 'Pset_Aerius', props);
    assignPropertySet(model, pset.expressID, elementIds);
  }
}
