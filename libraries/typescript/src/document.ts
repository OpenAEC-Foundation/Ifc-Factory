import type {
  IfcxDocument as IIfcxDocument,
  Header, Tables, Entity, DrawingObject, BlockDefinition,
  Layer, TextStyle, DimStyle, Linetype,
} from './types.js';

/**
 * In-memory representation of an IFCX document.
 * Provides methods for creating, querying, and manipulating drawing data.
 */
export class IfcxDocument {
  ifcx: '1.0' = '1.0';
  header: Header;
  tables: Tables;
  blocks: Record<string, BlockDefinition>;
  entities: Entity[];
  objects: DrawingObject[];
  extensions: Record<string, unknown>;

  private nextHandle = 1;

  constructor(init?: Partial<IIfcxDocument>) {
    this.header = init?.header ?? { units: { measurement: 'metric', linear: 'millimeters' } };
    this.tables = init?.tables ?? { layers: { '0': {} }, linetypes: {}, textStyles: {}, dimStyles: {} };
    this.blocks = init?.blocks ?? {};
    this.entities = init?.entities ?? [];
    this.objects = init?.objects ?? [];
    this.extensions = init?.extensions ?? {};
  }

  /** Generate a unique hex handle */
  allocHandle(): string {
    return (this.nextHandle++).toString(16).toUpperCase();
  }

  /** Add a layer */
  addLayer(name: string, props: Layer = {}): void {
    this.tables.layers ??= {};
    this.tables.layers[name] = props;
  }

  /** Add a linetype */
  addLinetype(name: string, props: Linetype): void {
    this.tables.linetypes ??= {};
    this.tables.linetypes[name] = props;
  }

  /** Add a text style */
  addTextStyle(name: string, props: TextStyle): void {
    this.tables.textStyles ??= {};
    this.tables.textStyles[name] = props;
  }

  /** Add a dimension style */
  addDimStyle(name: string, props: DimStyle): void {
    this.tables.dimStyles ??= {};
    this.tables.dimStyles[name] = props;
  }

  /** Add an entity and auto-assign handle */
  addEntity(entity: Entity): string {
    const handle = this.allocHandle();
    entity.handle = handle;
    this.entities.push(entity);
    return handle;
  }

  /** Add a block definition */
  addBlock(block: BlockDefinition): void {
    this.blocks[block.name] = block;
  }

  /** Find entities by type */
  findByType<T extends Entity['type']>(type: T): Extract<Entity, { type: T }>[] {
    return this.entities.filter(e => e.type === type) as Extract<Entity, { type: T }>[];
  }

  /** Find entities on a specific layer */
  findByLayer(layer: string): Entity[] {
    return this.entities.filter(e => e.layer === layer);
  }

  /** Get entity by handle */
  getByHandle(handle: string): Entity | undefined {
    return this.entities.find(e => e.handle === handle);
  }

  /** Serialize to IFCX JSON */
  toJSON(): IIfcxDocument {
    return {
      ifcx: this.ifcx,
      header: this.header,
      tables: this.tables,
      blocks: this.blocks,
      entities: this.entities,
      objects: this.objects,
      extensions: this.extensions,
    };
  }

  /** Parse from IFCX JSON */
  static fromJSON(json: IIfcxDocument): IfcxDocument {
    return new IfcxDocument(json);
  }
}
