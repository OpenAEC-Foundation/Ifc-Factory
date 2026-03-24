#ifndef IFCX_BINARY_H
#define IFCX_BINARY_H

#include <cstdint>
#include <vector>

#include "ifcx/document.h"

namespace ifcx {

class IfcxbEncoder {
public:
    /// Encode an IfcxDocument to binary IFCXB format.
    /// @throws std::runtime_error (not yet implemented)
    static std::vector<uint8_t> encode(const IfcxDocument& doc);
};

class IfcxbDecoder {
public:
    /// Decode binary IFCXB data into an IfcxDocument.
    /// Validates the "IFCX" magic bytes at the start of the buffer.
    /// @throws std::runtime_error (not yet implemented)
    static IfcxDocument decode(const std::vector<uint8_t>& data);
};

} // namespace ifcx

#endif // IFCX_BINARY_H
