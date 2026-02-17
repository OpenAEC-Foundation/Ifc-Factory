import type { IfcModel, SpatialTreeNode } from '../model/ifc-model.js';
import type { IfcGenericEntity } from '@ifc-factory/schema';
import { generateIfcGuid } from '../guid/ifc-guid.js';

export function createSpatialStructure(
  model: IfcModel,
  options: {
    projectName: string;
    siteName?: string;
    buildingName?: string;
    storeyNames?: string[];
  },
): IfcGenericEntity {
  const project = model.create('IfcProject', {
    GlobalId: generateIfcGuid(),
    Name: options.projectName,
  });

  if (options.siteName) {
    const site = model.create('IfcSite', {
      GlobalId: generateIfcGuid(),
      Name: options.siteName,
    });

    model.create('IfcRelAggregates', {
      GlobalId: generateIfcGuid(),
      RelatingObject: project.expressID,
      RelatedObjects: [site.expressID],
    });

    if (options.buildingName) {
      const building = model.create('IfcBuilding', {
        GlobalId: generateIfcGuid(),
        Name: options.buildingName,
      });

      model.create('IfcRelAggregates', {
        GlobalId: generateIfcGuid(),
        RelatingObject: site.expressID,
        RelatedObjects: [building.expressID],
      });

      if (options.storeyNames) {
        const storeyIds: number[] = [];
        for (const name of options.storeyNames) {
          const storey = model.create('IfcBuildingStorey', {
            GlobalId: generateIfcGuid(),
            Name: name,
          });
          storeyIds.push(storey.expressID);
        }

        if (storeyIds.length > 0) {
          model.create('IfcRelAggregates', {
            GlobalId: generateIfcGuid(),
            RelatingObject: building.expressID,
            RelatedObjects: storeyIds,
          });
        }
      }
    }
  }

  return project;
}

export function flattenSpatialTree(node: SpatialTreeNode): IfcGenericEntity[] {
  const result: IfcGenericEntity[] = [node.entity];
  for (const child of node.children) {
    result.push(...flattenSpatialTree(child));
  }
  return result;
}
