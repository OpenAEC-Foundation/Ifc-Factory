import type {
  SchemaNode,
  EntityDeclaration,
  TypeDeclaration,
} from '@ifc-factory/express-parser';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { emitEnum } from './emitters/enum-emitter.js';
import { emitTypeAlias } from './emitters/type-alias-emitter.js';
import { emitSelect, getSelectImports } from './emitters/select-emitter.js';
import { emitEntity } from './emitters/entity-emitter.js';
import { emitSchemaMetadata } from './emitters/metadata-emitter.js';
import { emitEntityRegistry } from './emitters/registry-emitter.js';
import { emitFullBarrel } from './emitters/index-emitter.js';
import { mapExpressTypeToTS, getImportsForType } from './mapping.js';

export interface GenerateOptions {
  outputDir: string;
}

export function generate(schema: SchemaNode, options: GenerateOptions): void {
  const { outputDir } = options;

  // Collect declarations by kind
  const entities = new Map<string, EntityDeclaration>();
  const types = new Map<string, TypeDeclaration>();
  const enumDecls: TypeDeclaration[] = [];
  const selectDecls: TypeDeclaration[] = [];
  const typeAliasDecls: TypeDeclaration[] = [];

  // Also track what category each name falls in
  const allTypeNames = new Map<string, string>(); // name → category

  for (const decl of schema.declarations) {
    if (decl.kind === 'entity') {
      entities.set(decl.name, decl);
      allTypeNames.set(decl.name, 'entity');
    } else if (decl.kind === 'type') {
      types.set(decl.name, decl);
      if (decl.underlyingType.kind === 'enumeration') {
        enumDecls.push(decl);
        allTypeNames.set(decl.name, 'enum');
      } else if (decl.underlyingType.kind === 'select') {
        selectDecls.push(decl);
        allTypeNames.set(decl.name, 'select');
      } else {
        typeAliasDecls.push(decl);
        allTypeNames.set(decl.name, 'type');
      }
    }
  }

  // Create output directories
  const dirs = [
    'entities',
    'enums',
    'types',
    'selects',
    'metadata',
  ];
  for (const dir of dirs) {
    fs.mkdirSync(path.join(outputDir, dir), { recursive: true });
  }

  // Generate enums
  const enumNames: string[] = [];
  for (const decl of enumDecls) {
    const content = emitEnum(decl);
    if (content) {
      enumNames.push(decl.name);
      writeFile(path.join(outputDir, 'enums', `${decl.name}.ts`), content);
    }
  }

  // Generate type aliases
  const typeNames: string[] = [];
  for (const decl of typeAliasDecls) {
    const content = emitTypeAlias(decl);
    if (content) {
      // Check if the underlying type references another type
      const imports = getImportsForType(decl.underlyingType, '');
      let header = '';
      for (const imp of imports) {
        const cat = allTypeNames.get(imp.name);
        if (cat) {
          const importPath = getRelativeImport('types', imp.name, cat);
          header += `import type { ${imp.name} } from '${importPath}';\n`;
        }
      }

      // For aggregation types, check element type too
      if (decl.underlyingType.kind === 'aggregation') {
        const elImports = getImportsForType(decl.underlyingType.elementType, '');
        for (const imp of elImports) {
          const cat = allTypeNames.get(imp.name);
          if (cat && !header.includes(imp.name)) {
            const importPath = getRelativeImport('types', imp.name, cat);
            header += `import type { ${imp.name} } from '${importPath}';\n`;
          }
        }
      }

      typeNames.push(decl.name);
      writeFile(
        path.join(outputDir, 'types', `${decl.name}.ts`),
        header ? `${header}\n${content}` : content,
      );
    }
  }

  // Generate selects
  const selectNames: string[] = [];
  for (const decl of selectDecls) {
    const content = emitSelect(decl);
    if (content) {
      const imports = getSelectImports(decl);
      let header = '';
      for (const imp of imports) {
        const cat = allTypeNames.get(imp);
        if (cat) {
          const importPath = getRelativeImport('selects', imp, cat);
          header += `import type { ${imp} } from '${importPath}';\n`;
        }
      }

      selectNames.push(decl.name);
      writeFile(
        path.join(outputDir, 'selects', `${decl.name}.ts`),
        header ? `${header}\n${content}` : content,
      );
    }
  }

  // Generate entities
  const entityNames: string[] = [];
  for (const [name, decl] of entities) {
    const info = emitEntity(decl, entities, allTypeNames);
    entityNames.push(name);

    // Build import header
    let header = '';
    for (const imp of info.imports) {
      if (imp === name) continue; // Skip self-reference
      const cat = allTypeNames.get(imp);
      if (cat) {
        const importPath = getRelativeImport('entities', imp, cat);
        header += `import type { ${imp} } from '${importPath}';\n`;
      }
    }

    writeFile(
      path.join(outputDir, 'entities', `${name}.ts`),
      header ? `${header}\n${info.content}` : info.content,
    );
  }

  // Generate metadata
  const sortedEntities = [...entities.values()].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const metadataContent = emitSchemaMetadata(sortedEntities, entities);
  writeFile(
    path.join(outputDir, 'metadata', 'schema-metadata.ts'),
    metadataContent,
  );

  // Generate registry
  const registryContent = emitEntityRegistry(entityNames.sort());
  writeFile(
    path.join(outputDir, 'metadata', 'entity-registry.ts'),
    registryContent,
  );

  // Generate barrel index
  const barrelContent = emitFullBarrel(
    entityNames.sort(),
    enumNames.sort(),
    typeNames.sort(),
    selectNames.sort(),
  );
  writeFile(path.join(outputDir, 'index.ts'), barrelContent);

  console.log(
    `Generated: ${entityNames.length} entities, ${enumNames.length} enums, ${typeNames.length} types, ${selectNames.length} selects`,
  );
}

function getRelativeImport(
  fromDir: string,
  targetName: string,
  targetCategory: string,
): string {
  const categoryDirs: Record<string, string> = {
    entity: 'entities',
    enum: 'enums',
    type: 'types',
    select: 'selects',
  };
  const targetDir = categoryDirs[targetCategory] ?? targetCategory;

  if (fromDir === targetDir) {
    return `./${targetName}.js`;
  }
  return `../${targetDir}/${targetName}.js`;
}

function writeFile(filePath: string, content: string): void {
  fs.writeFileSync(filePath, content, 'utf-8');
}
