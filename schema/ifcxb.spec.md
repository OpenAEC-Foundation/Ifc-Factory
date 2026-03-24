# IFCXB Binary Format Specification v1.0

## Overview

IFCXB is the binary companion to IFCX (JSON). It uses a GLB-inspired chunked
container with CBOR encoding and Zstandard compression to achieve file sizes
comparable to DWG while maintaining lossless round-trip with IFCX JSON.

## File Layout

```
+------------------------------------------+
| HEADER (16 bytes)                        |
+------------------------------------------+
| CHUNK 0: META  (CBOR, compressed)        |
+------------------------------------------+
| CHUNK 1: DATA  (CBOR, compressed)        |
+------------------------------------------+
| CHUNK 2: GEOM  (binary, compressed)      |
+------------------------------------------+
| CHUNK 3: MEDIA (binary, optional)        |
+------------------------------------------+
```

## Header (16 bytes)

| Offset | Size | Type   | Description                    |
|--------|------|--------|--------------------------------|
| 0      | 4    | ASCII  | Magic: `IFCX`                  |
| 4      | 4    | uint32 | Version: `0x00010000` (1.0)    |
| 8      | 4    | uint32 | Flags (see below)              |
| 12     | 4    | uint32 | Total file length in bytes     |

### Flags (bitfield)

| Bit  | Meaning                              |
|------|--------------------------------------|
| 0-3  | Compression: 0=none, 1=zstd, 2=lz4, 3=brotli |
| 4    | Checksums present (CRC32 per chunk)  |
| 5    | String table in META chunk           |
| 6-31 | Reserved (must be 0)                 |

## Chunk Structure

Each chunk:

| Offset | Size | Type   | Description                    |
|--------|------|--------|--------------------------------|
| 0      | 4    | uint32 | Chunk data length (compressed) |
| 4      | 4    | ASCII  | Chunk type (`META`, `DATA`, `GEOM`, `MDIA`) |
| 8      | 4    | uint32 | Uncompressed length            |
| 12     | 4    | uint32 | CRC32 (if checksums enabled)   |
| 16     | N    | bytes  | Chunk data                     |

Chunks are padded to 8-byte alignment.

## META Chunk

CBOR-encoded object containing:

```json
{
  "ifcx": "1.0",
  "header": { ... },
  "tables": { ... },
  "blocks": { ... },
  "objects": [ ... ],
  "stringTable": ["LAYER", "LINE", "CIRCLE", ...],
  "entityIndex": {
    "handleToOffset": { "A1": 0, "A2": 128, ... },
    "typeGroups": { "LINE": [0, 128, 256], ... }
  }
}
```

- `stringTable`: Deduplicated strings referenced by index in DATA chunk
- `entityIndex`: Maps entity handles to byte offsets in DATA chunk for random access

## DATA Chunk

CBOR-encoded array of entities. String values reference the string table by
integer index. Entity references use compact integer handles.

Each entity is a CBOR map:
```cbor
{
  0: <type_index>,     // string table index for entity type
  1: <handle>,         // integer handle
  2: <layer_index>,    // string table index for layer name
  3: { ... },          // type-specific properties
  4: <geom_offset>,    // byte offset into GEOM chunk (if applicable)
  5: <geom_length>     // byte length in GEOM chunk
}
```

## GEOM Chunk

Raw binary geometry data. Accessed via offsets from entity records.

| Data Type         | Encoding           | Bytes/element |
|-------------------|--------------------|---------------|
| 2D coordinates    | Float64Array (LE)  | 16 per point  |
| 3D coordinates    | Float64Array (LE)  | 24 per point  |
| Vertex indices    | Uint32Array (LE)   | 4 per index   |
| Knot vectors      | Float64Array (LE)  | 8 per knot    |
| Bulge values      | Float64Array (LE)  | 8 per value   |

Each geometry block is prefixed with:
- 1 byte: geometry type enum
- 4 bytes: element count (uint32 LE)
- N bytes: packed data

### Geometry Type Enum

| Value | Type                |
|-------|---------------------|
| 0x01  | Point2D array       |
| 0x02  | Point3D array       |
| 0x03  | Uint32 index array  |
| 0x04  | Float64 array       |
| 0x05  | Mixed vertex data   |

## MEDIA Chunk (Optional)

Stores embedded binary data (images, OLE objects, thumbnails).

Structure: array of media entries, each with:
- 4 bytes: media ID (uint32)
- 4 bytes: media type enum
- 4 bytes: data length
- N bytes: raw media data

## Compression

Default: Zstandard level 3 (good balance of speed and ratio).

Each chunk is compressed independently, allowing:
- Selective decompression (read META without decompressing GEOM)
- Parallel decompression of chunks
- Different compression levels per chunk type

## Expected Size Ratios

| Format       | Relative Size |
|--------------|---------------|
| IFCX (JSON)  | 1.0x          |
| IFCXB (raw)  | 0.15-0.25x    |
| IFCXB (zstd) | 0.05-0.12x    |
| DWG          | ~0.08-0.15x   |
| DXF          | ~1.5-3.0x     |

## Round-Trip Guarantee

IFCX (JSON) ↔ IFCXB conversion MUST be lossless. The canonical form is IFCX
JSON. IFCXB is a storage/transport optimization only.

## Versioning

The version field in the header tracks the binary container format version.
The schema version is in the META chunk's `ifcx` field. These may evolve
independently.
