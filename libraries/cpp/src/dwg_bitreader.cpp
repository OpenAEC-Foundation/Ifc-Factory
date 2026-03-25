#include "ifcx/dwg_parser.h"

#include <algorithm>
#include <cstring>
#include <stdexcept>

namespace ifcx {

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

DwgBitReader::DwgBitReader(const uint8_t* data, size_t size, size_t byte_offset)
    : data_(data), size_(size), bit_position_(byte_offset * 8) {}

DwgBitReader::DwgBitReader(const std::vector<uint8_t>& data, size_t byte_offset)
    : data_(data.data()), size_(data.size()), bit_position_(byte_offset * 8) {}

// ---------------------------------------------------------------------------
// Low-level bit reading
// ---------------------------------------------------------------------------

int DwgBitReader::read_bit() {
    size_t byte_idx = bit_position_ >> 3;
    int bit_idx = 7 - (bit_position_ & 7);
    if (byte_idx >= size_) {
        throw std::runtime_error("DwgBitReader: read past end of data");
    }
    int val = (data_[byte_idx] >> bit_idx) & 1;
    bit_position_++;
    return val;
}

uint32_t DwgBitReader::read_bits(int count) {
    uint32_t result = 0;
    for (int i = 0; i < count; ++i) {
        result = (result << 1) | static_cast<uint32_t>(read_bit());
    }
    return result;
}

// ---------------------------------------------------------------------------
// Raw fixed-size types
// ---------------------------------------------------------------------------

uint8_t DwgBitReader::read_byte() {
    return static_cast<uint8_t>(read_bits(8));
}

int16_t DwgBitReader::read_short() {
    uint32_t lo = read_bits(8);
    uint32_t hi = read_bits(8);
    uint16_t val = static_cast<uint16_t>(lo | (hi << 8));
    if (val >= 0x8000) {
        return static_cast<int16_t>(val - 0x10000);
    }
    return static_cast<int16_t>(val);
}

uint16_t DwgBitReader::read_raw_short() {
    uint32_t lo = read_bits(8);
    uint32_t hi = read_bits(8);
    return static_cast<uint16_t>(lo | (hi << 8));
}

int32_t DwgBitReader::read_long() {
    uint32_t b0 = read_bits(8);
    uint32_t b1 = read_bits(8);
    uint32_t b2 = read_bits(8);
    uint32_t b3 = read_bits(8);
    uint32_t val = b0 | (b1 << 8) | (b2 << 16) | (b3 << 24);
    return static_cast<int32_t>(val);
}

uint32_t DwgBitReader::read_raw_long() {
    uint32_t b0 = read_bits(8);
    uint32_t b1 = read_bits(8);
    uint32_t b2 = read_bits(8);
    uint32_t b3 = read_bits(8);
    return b0 | (b1 << 8) | (b2 << 16) | (b3 << 24);
}

double DwgBitReader::read_double() {
    uint8_t raw[8];
    for (int i = 0; i < 8; ++i) {
        raw[i] = read_byte();
    }
    double val;
    std::memcpy(&val, raw, 8);
    return val;
}

// ---------------------------------------------------------------------------
// DWG compressed types
// ---------------------------------------------------------------------------

int DwgBitReader::read_BB() {
    return static_cast<int>(read_bits(2));
}

int DwgBitReader::read_BS() {
    int prefix = read_BB();
    if (prefix == 0) return read_short();
    if (prefix == 1) return read_byte();
    if (prefix == 2) return 0;
    return 256;
}

int32_t DwgBitReader::read_BL() {
    int prefix = read_BB();
    if (prefix == 0) return read_long();
    if (prefix == 1) return read_byte();
    if (prefix == 2) return 0;
    return read_long();
}

double DwgBitReader::read_BD() {
    int prefix = read_BB();
    if (prefix == 0) return read_double();
    if (prefix == 1) return 1.0;
    return 0.0;
}

double DwgBitReader::read_DD(double default_val) {
    int prefix = read_BB();
    if (prefix == 0) return default_val;
    if (prefix == 3) return read_double();

    uint8_t raw[8];
    std::memcpy(raw, &default_val, 8);
    if (prefix == 1) {
        raw[0] = read_byte();
        raw[1] = read_byte();
        raw[2] = read_byte();
        raw[3] = read_byte();
    } else if (prefix == 2) {
        raw[4] = read_byte();
        raw[5] = read_byte();
        raw[0] = read_byte();
        raw[1] = read_byte();
        raw[2] = read_byte();
        raw[3] = read_byte();
    }
    double result;
    std::memcpy(&result, raw, 8);
    return result;
}

double DwgBitReader::read_BT() {
    if (read_bit()) return 0.0;
    return read_BD();
}

std::tuple<double, double, double> DwgBitReader::read_BE() {
    if (read_bit()) return {0.0, 0.0, 1.0};
    double x = read_BD();
    double y = read_BD();
    double z = read_BD();
    if (x == 0.0 && y == 0.0) {
        z = (z <= 0.0) ? -1.0 : 1.0;
    }
    return {x, y, z};
}

// ---------------------------------------------------------------------------
// Handle references
// ---------------------------------------------------------------------------

std::pair<int, uint32_t> DwgBitReader::read_H() {
    int code = static_cast<int>(read_bits(4));
    int counter = static_cast<int>(read_bits(4));
    uint32_t handle = 0;
    for (int i = 0; i < counter; ++i) {
        handle = (handle << 8) | read_byte();
    }
    return {code, handle};
}

// ---------------------------------------------------------------------------
// Text strings
// ---------------------------------------------------------------------------

std::string DwgBitReader::read_T(bool is_unicode) {
    int length = read_BS();
    if (length <= 0) return "";
    if (is_unicode) {
        std::string result;
        for (int i = 0; i < length; ++i) {
            uint8_t lo = read_byte();
            uint8_t hi = read_byte();
            uint16_t ch = lo | (static_cast<uint16_t>(hi) << 8);
            if (ch == 0) break;
            if (ch < 128) result += static_cast<char>(ch);
            else result += '?'; // Simplified UTF-16 to ASCII
        }
        return result;
    } else {
        std::string result;
        result.reserve(length);
        for (int i = 0; i < length; ++i) {
            uint8_t ch = read_byte();
            if (ch == 0) break;
            result += static_cast<char>(ch);
        }
        return result;
    }
}

// ---------------------------------------------------------------------------
// Point helpers
// ---------------------------------------------------------------------------

std::pair<double, double> DwgBitReader::read_2RD() {
    double x = read_double();
    double y = read_double();
    return {x, y};
}

std::tuple<double, double, double> DwgBitReader::read_3RD() {
    return {read_double(), read_double(), read_double()};
}

std::pair<double, double> DwgBitReader::read_2BD() {
    return {read_BD(), read_BD()};
}

std::tuple<double, double, double> DwgBitReader::read_3BD() {
    return {read_BD(), read_BD(), read_BD()};
}

// ---------------------------------------------------------------------------
// Color
// ---------------------------------------------------------------------------

int DwgBitReader::read_CMC() {
    return read_BS();
}

// ---------------------------------------------------------------------------
// Modular char / modular short
// ---------------------------------------------------------------------------

std::pair<int32_t, size_t> DwgBitReader::read_modular_char(const uint8_t* data, size_t size, size_t pos) {
    int32_t result = 0;
    int shift = 0;
    bool negative = false;

    while (true) {
        if (pos >= size) {
            throw std::runtime_error("modular_char: unexpected end of data");
        }
        uint8_t b = data[pos++];
        bool cont = (b & 0x80) != 0;
        result |= static_cast<int32_t>(b & 0x7F) << shift;
        shift += 7;
        if (!cont) {
            if (b & 0x40) {
                negative = true;
                result &= ~(static_cast<int32_t>(0x40) << (shift - 7));
            }
            break;
        }
    }
    if (negative) result = -result;
    return {result, pos};
}

std::pair<uint32_t, size_t> DwgBitReader::read_modular_short(const uint8_t* data, size_t size, size_t pos) {
    uint32_t result = 0;
    int shift = 0;

    while (true) {
        if (pos + 1 >= size) {
            throw std::runtime_error("modular_short: unexpected end of data");
        }
        uint8_t lo = data[pos];
        uint8_t hi = data[pos + 1];
        pos += 2;
        uint32_t word = lo | (static_cast<uint32_t>(hi & 0x7F) << 8);
        result |= word << shift;
        shift += 15;
        if (!(hi & 0x80)) break;
    }
    return {result, pos};
}

// ---------------------------------------------------------------------------
// Positioning
// ---------------------------------------------------------------------------

void DwgBitReader::seek_byte(size_t offset) {
    bit_position_ = offset * 8;
}

void DwgBitReader::seek_bit(size_t bit_offset) {
    bit_position_ = bit_offset;
}

size_t DwgBitReader::tell_byte() const {
    return bit_position_ >> 3;
}

size_t DwgBitReader::tell_bit() const {
    return bit_position_;
}

void DwgBitReader::align_byte() {
    size_t rem = bit_position_ & 7;
    if (rem) bit_position_ += 8 - rem;
}

size_t DwgBitReader::remaining_bytes() const {
    size_t current = tell_byte();
    return (current < size_) ? (size_ - current) : 0;
}

std::vector<uint8_t> DwgBitReader::read_raw_bytes(size_t count) {
    std::vector<uint8_t> result(count);
    for (size_t i = 0; i < count; ++i) {
        result[i] = read_byte();
    }
    return result;
}

} // namespace ifcx
