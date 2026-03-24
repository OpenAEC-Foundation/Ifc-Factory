#include "ifcx/binary.h"

#include <cstring>
#include <stdexcept>

namespace ifcx {

static constexpr char IFCX_MAGIC[] = "IFCX";
static constexpr size_t IFCX_MAGIC_SIZE = 4;

std::vector<uint8_t> IfcxbEncoder::encode(const IfcxDocument& /*doc*/) {
    throw std::runtime_error("IfcxbEncoder::encode is not yet implemented");
}

IfcxDocument IfcxbDecoder::decode(const std::vector<uint8_t>& data) {
    // Validate magic bytes
    if (data.size() < IFCX_MAGIC_SIZE) {
        throw std::runtime_error("Invalid IFCXB data: too short");
    }

    if (std::memcmp(data.data(), IFCX_MAGIC, IFCX_MAGIC_SIZE) != 0) {
        throw std::runtime_error("Invalid IFCXB data: missing 'IFCX' magic header");
    }

    throw std::runtime_error("IfcxbDecoder::decode is not yet implemented");
}

} // namespace ifcx
