# Package Reference

Ifc-Factory consists of 7 packages organized in dependency layers.

| Package | npm | Description | Layer |
|---------|-----|-------------|-------|
| `@ifc-factory/express-parser` | [![npm](https://img.shields.io/npm/v/@ifc-factory/express-parser)](https://npmjs.com/package/@ifc-factory/express-parser) | EXPRESS schema (.exp) parser | 0 |
| `@ifc-factory/step-serializer` | [![npm](https://img.shields.io/npm/v/@ifc-factory/step-serializer)](https://npmjs.com/package/@ifc-factory/step-serializer) | ISO 10303-21 STEP tokenizer/reader/writer | 0 |
| `@ifc-factory/codegen` | [![npm](https://img.shields.io/npm/v/@ifc-factory/codegen)](https://npmjs.com/package/@ifc-factory/codegen) | TypeScript code generator from EXPRESS AST | 1 |
| `@ifc-factory/schema` | [![npm](https://img.shields.io/npm/v/@ifc-factory/schema)](https://npmjs.com/package/@ifc-factory/schema) | Auto-generated IFC4X3 TypeScript types | 2 |
| `@ifc-factory/step-parser` | [![npm](https://img.shields.io/npm/v/@ifc-factory/step-parser)](https://npmjs.com/package/@ifc-factory/step-parser) | Schema-aware STEP parser | 2 |
| `@ifc-factory/core` | [![npm](https://img.shields.io/npm/v/@ifc-factory/core)](https://npmjs.com/package/@ifc-factory/core) | Main library: IfcModel, helpers, compliance | 3 |
| `@ifc-factory/ifc-utils` | [![npm](https://img.shields.io/npm/v/@ifc-factory/ifc-utils)](https://npmjs.com/package/@ifc-factory/ifc-utils) | Convenience utilities (validation, diff, batch) | 4 |

## Which packages do I need?

**Most users** only need:
```bash
pnpm add @ifc-factory/core @ifc-factory/schema
```

The `core` package re-exports everything needed for typical IFC operations. Add `@ifc-factory/ifc-utils` for model validation, diffing, and batch operations.

**Advanced users** who want to work with raw STEP data or custom schemas may also use `step-serializer` or `express-parser` directly.

## Detailed Pages

- [[express-parser]] — EXPRESS schema parser
- [[step-serializer]] — STEP file I/O
- [[codegen]] — TypeScript code generator
- [[schema]] — Generated IFC4X3 types
- [[step-parser]] — Schema-aware STEP parser
- [[core]] — Main library
- [[ifc-utils]] — Utility functions
