#include "ifcx/dgn_parser.h"

#include <algorithm>
#define _USE_MATH_DEFINES
#include <cmath>

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif
#include <cstring>
#include <set>
#include <stdexcept>

namespace ifcx {

// ---------------------------------------------------------------------------
// DGN element type constants
// ---------------------------------------------------------------------------

const std::map<int, std::string> DGN_ELEMENT_TYPES = {
    {1, "CELL_LIBRARY"}, {2, "CELL_HEADER"}, {3, "LINE"},
    {4, "LINE_STRING"}, {5, "GROUP_DATA"}, {6, "SHAPE"},
    {7, "TEXT_NODE"}, {8, "DIGITIZER_SETUP"}, {9, "TCB"},
    {10, "LEVEL_SYMBOLOGY"}, {11, "CURVE"},
    {12, "COMPLEX_CHAIN_HEADER"}, {14, "COMPLEX_SHAPE_HEADER"},
    {15, "ELLIPSE"}, {16, "ARC"}, {17, "TEXT"},
    {18, "3DSURFACE_HEADER"}, {19, "3DSOLID_HEADER"},
    {21, "BSPLINE_POLE"}, {22, "POINT_STRING"},
    {23, "CONE"}, {24, "BSPLINE_SURFACE_HEADER"},
    {25, "BSPLINE_SURFACE_BOUNDARY"}, {26, "BSPLINE_KNOT"},
    {27, "BSPLINE_CURVE_HEADER"}, {28, "BSPLINE_WEIGHT_FACTOR"},
    {33, "DIMENSION"}, {34, "SHARED_CELL_DEFN"},
    {35, "SHARED_CELL"}, {37, "TAG_VALUE"}, {66, "APPLICATION"},
};

// Element types without display header
static const std::set<int> NO_DISPHDR = {
    0, 1, 9, 10, 32, 44, 48, 49, 50, 51, 57, 60, 61, 62, 63,
};

// ---------------------------------------------------------------------------
// DgnParser
// ---------------------------------------------------------------------------

DgnParser::DgnParser() = default;

bool DgnParser::has_no_display_header(int etype) {
    return NO_DISPHDR.count(etype) > 0;
}

DgnFile DgnParser::parse(const uint8_t* data, size_t size) {
    DgnFile dgn;
    if (size < 4) return dgn;

    // Quick 2D/3D check
    if (data[0] == 0xC8) {
        dimension_ = 3;
        dgn.is_3d = true;
    } else {
        dimension_ = 2;
        dgn.is_3d = false;
    }

    size_t offset = 0;
    while (offset < size - 3) {
        // EOF marker
        if (data[offset] == 0xFF && data[offset + 1] == 0xFF) break;

        auto elem = read_element(data, size, offset, dgn);
        if (!elem) break;
        dgn.elements.push_back(std::move(*elem));
        offset += elem->size;
    }

    return dgn;
}

DgnFile DgnParser::parse(const std::vector<uint8_t>& data) {
    return parse(data.data(), data.size());
}

// ---------------------------------------------------------------------------
// Low-level binary helpers
// ---------------------------------------------------------------------------

uint16_t DgnParser::read_uint16_le(const uint8_t* data, size_t offset) {
    return data[offset] + data[offset + 1] * 256;
}

uint32_t DgnParser::read_int32_me(const uint8_t* data, size_t offset) {
    return data[offset + 2]
         + data[offset + 3] * 256u
         + data[offset + 1] * 256u * 65536u
         + data[offset] * 65536u;
}

int32_t DgnParser::read_int32_me_signed(const uint8_t* data, size_t offset) {
    uint32_t v = read_int32_me(data, offset);
    if (v >= 0x80000000u) return static_cast<int32_t>(v - 0x100000000LL);
    return static_cast<int32_t>(v);
}

double DgnParser::vax_to_ieee(const uint8_t* data, size_t offset) {
    const uint8_t* src = data + offset;
    uint8_t dest[8];
    dest[2] = src[0]; dest[3] = src[1];
    dest[0] = src[2]; dest[1] = src[3];
    dest[6] = src[4]; dest[7] = src[5];
    dest[4] = src[6]; dest[5] = src[7];

    uint32_t dt_hi, dt_lo;
    std::memcpy(&dt_hi, dest, 4);
    std::memcpy(&dt_lo, dest + 4, 4);

    uint32_t sign = dt_hi & 0x80000000u;
    uint32_t exponent = (dt_hi >> 23) & 0xFF;
    if (exponent != 0) exponent = exponent - 129 + 1023;

    uint32_t rndbits = dt_lo & 0x00000007u;
    dt_lo = dt_lo >> 3;
    dt_lo = (dt_lo & 0x1FFFFFFFu) | ((dt_hi << 29) & 0xFFFFFFFFu);
    if (rndbits) dt_lo = dt_lo | 0x00000001u;

    dt_hi = dt_hi >> 3;
    dt_hi = dt_hi & 0x000FFFFFu;
    dt_hi = dt_hi | ((exponent << 20) & 0xFFFFFFFFu) | sign;

    uint8_t ieee_bytes[8];
    std::memcpy(ieee_bytes, &dt_lo, 4);
    std::memcpy(ieee_bytes + 4, &dt_hi, 4);
    double result;
    std::memcpy(&result, ieee_bytes, 8);
    return result;
}

// ---------------------------------------------------------------------------
// Element reading
// ---------------------------------------------------------------------------

std::optional<DgnElement> DgnParser::read_element(const uint8_t* data, size_t data_size,
                                                    size_t offset, DgnFile& dgn) {
    if (offset + 4 > data_size) return std::nullopt;

    uint8_t b0 = data[offset];
    uint8_t b1 = data[offset + 1];

    int level = b0 & 0x3F;
    bool complex_flag = (b0 & 0x80) != 0;
    int etype = b1 & 0x7F;
    bool deleted = (b1 & 0x80) != 0;

    uint16_t n_words = read_uint16_le(data, offset + 2);
    size_t elem_size = static_cast<size_t>(n_words) * 2 + 4;

    if (elem_size < 4 || offset + elem_size > data_size) return std::nullopt;

    auto type_it = DGN_ELEMENT_TYPES.find(etype);
    std::string type_name = (type_it != DGN_ELEMENT_TYPES.end()) ?
                            type_it->second : ("UNKNOWN_" + std::to_string(etype));

    DgnElement elem;
    elem.type = etype;
    elem.type_name = type_name;
    elem.level = level;
    elem.deleted = deleted;
    elem.complex = complex_flag;
    elem.offset = offset;
    elem.size = elem_size;

    // Parse display header
    if (!has_no_display_header(etype) && elem_size >= 36) {
        elem.graphic_group = read_uint16_le(data, offset + 28);
        elem.properties = read_uint16_le(data, offset + 32);
        elem.style = data[offset + 34] & 0x07;
        elem.weight = (data[offset + 34] & 0xF8) >> 3;
        elem.color = data[offset + 35];
    }

    // Parse element-specific data
    const uint8_t* raw = data + offset;
    size_t raw_size = elem_size;

    try {
        if (etype == 9) parse_tcb(raw, raw_size, dgn);
        else if (etype == 5 && level == 1) parse_color_table(raw, raw_size, dgn);
        else if (etype == 3) elem.data = parse_line(raw, raw_size);
        else if (etype == 4 || etype == 6 || etype == 11 || etype == 21)
            elem.data = parse_multipoint(raw, raw_size, etype);
        else if (etype == 15) elem.data = parse_ellipse_element(raw, raw_size);
        else if (etype == 16) elem.data = parse_arc_element(raw, raw_size);
        else if (etype == 17) elem.data = parse_text_element(raw, raw_size);
        else if (etype == 7) elem.data = parse_text_node(raw, raw_size);
        else if (etype == 2) elem.data = parse_cell_header(raw, raw_size);
        else if (etype == 12 || etype == 14 || etype == 18 || etype == 19)
            elem.data = parse_complex_header(raw, raw_size);
        else if (etype == 37) elem.data = parse_tag_value(raw, raw_size);
    } catch (...) {
        // If parsing fails, continue
    }

    return elem;
}

// ---------------------------------------------------------------------------
// TCB parsing
// ---------------------------------------------------------------------------

void DgnParser::parse_tcb(const uint8_t* raw, size_t raw_size, DgnFile& dgn) {
    if (raw_size < 1264) return;
    if (got_tcb_) return;

    if (raw[1214] & 0x40) {
        dimension_ = 3;
        dgn.is_3d = true;
    } else {
        dimension_ = 2;
        dgn.is_3d = false;
    }

    uint32_t sub_per_master = read_int32_me(raw, 1112);
    uint32_t uor_per_sub = read_int32_me(raw, 1116);

    dgn.sub_per_master = sub_per_master ? sub_per_master : 1;
    dgn.uor_per_sub = uor_per_sub ? uor_per_sub : 1;

    if (raw_size > 1121) {
        dgn.master_unit_name = "";
        if (raw[1120]) dgn.master_unit_name += static_cast<char>(raw[1120]);
        if (raw[1121]) dgn.master_unit_name += static_cast<char>(raw[1121]);
    }
    if (raw_size > 1123) {
        dgn.sub_unit_name = "";
        if (raw[1122]) dgn.sub_unit_name += static_cast<char>(raw[1122]);
        if (raw[1123]) dgn.sub_unit_name += static_cast<char>(raw[1123]);
    }

    if (uor_per_sub && sub_per_master) {
        scale_ = 1.0 / (static_cast<double>(uor_per_sub) * sub_per_master);
    } else {
        scale_ = 1.0;
    }

    if (raw_size >= 1264) {
        double ox = vax_to_ieee(raw, 1240);
        double oy = vax_to_ieee(raw, 1248);
        double oz = vax_to_ieee(raw, 1256);

        if (uor_per_sub && sub_per_master) {
            double s = static_cast<double>(uor_per_sub) * sub_per_master;
            ox /= s; oy /= s; oz /= s;
        }

        origin_x_ = ox; origin_y_ = oy; origin_z_ = oz;
        dgn.global_origin = {ox, oy, oz};
    }

    got_tcb_ = true;
}

// ---------------------------------------------------------------------------
// Color table
// ---------------------------------------------------------------------------

void DgnParser::parse_color_table(const uint8_t* raw, size_t raw_size, DgnFile& dgn) {
    if (raw_size < 806) return;
    dgn.color_table.resize(256);
    dgn.color_table[255] = {raw[38], raw[39], raw[40]};
    for (int i = 0; i < 255; ++i) {
        size_t base = 41 + i * 3;
        dgn.color_table[i] = {raw[base], raw[base + 1], raw[base + 2]};
    }
}

// ---------------------------------------------------------------------------
// Coordinate transforms
// ---------------------------------------------------------------------------

std::tuple<double, double, double> DgnParser::transform_point(double x, double y, double z) {
    return {
        x * scale_ - origin_x_,
        y * scale_ - origin_y_,
        z * scale_ - origin_z_,
    };
}

std::tuple<double, double, double> DgnParser::read_point_int(const uint8_t* raw, size_t offset) {
    double x = read_int32_me_signed(raw, offset);
    double y = read_int32_me_signed(raw, offset + 4);
    double z = 0;
    if (dimension_ == 3) z = read_int32_me_signed(raw, offset + 8);
    return transform_point(x, y, z);
}

// ---------------------------------------------------------------------------
// Element-specific parsers
// ---------------------------------------------------------------------------

nlohmann::json DgnParser::parse_line(const uint8_t* raw, size_t raw_size) {
    int pntsize = dimension_ * 4;
    auto [x0, y0, z0] = read_point_int(raw, 36);
    auto [x1, y1, z1] = read_point_int(raw, 36 + pntsize);
    return nlohmann::json::object({
        {"vertices", nlohmann::json::array({
            nlohmann::json::array({x0, y0, z0}),
            nlohmann::json::array({x1, y1, z1}),
        })},
    });
}

nlohmann::json DgnParser::parse_multipoint(const uint8_t* raw, size_t raw_size, int etype) {
    int pntsize = dimension_ * 4;
    int count = read_uint16_le(raw, 36);
    int max_count = static_cast<int>((raw_size - 38) / pntsize);
    if (count > max_count) count = max_count;

    auto vertices = nlohmann::json::array();
    for (int i = 0; i < count; ++i) {
        auto [x, y, z] = read_point_int(raw, 38 + i * pntsize);
        vertices.push_back(nlohmann::json::array({x, y, z}));
    }

    nlohmann::json result = nlohmann::json::object({{"vertices", vertices}});
    if (etype == 6) result["closed"] = true;
    return result;
}

nlohmann::json DgnParser::parse_ellipse_element(const uint8_t* raw, size_t raw_size) {
    double primary = vax_to_ieee(raw, 36) * scale_;
    double secondary = vax_to_ieee(raw, 44) * scale_;
    double rotation = 0;
    std::tuple<double, double, double> origin;

    if (dimension_ == 2) {
        rotation = read_int32_me_signed(raw, 52) / 360000.0;
        double ox = vax_to_ieee(raw, 56);
        double oy = vax_to_ieee(raw, 64);
        origin = transform_point(ox, oy);
    } else {
        double ox = vax_to_ieee(raw, 68);
        double oy = vax_to_ieee(raw, 76);
        double oz = vax_to_ieee(raw, 84);
        origin = transform_point(ox, oy, oz);
        rotation = 0.0;
    }

    auto [ox, oy, oz] = origin;
    return nlohmann::json::object({
        {"primary_axis", primary}, {"secondary_axis", secondary},
        {"rotation", rotation},
        {"origin", nlohmann::json::array({ox, oy, oz})},
        {"start_angle", 0.0}, {"sweep_angle", 360.0},
    });
}

nlohmann::json DgnParser::parse_arc_element(const uint8_t* raw, size_t raw_size) {
    double start_ang = read_int32_me_signed(raw, 36) / 360000.0;

    // Sweep
    bool sweep_negative = (raw[41] & 0x80) != 0;
    std::vector<uint8_t> raw_mut(raw, raw + raw_size);
    raw_mut[41] = raw[41] & 0x7F;
    int32_t sweep_val = read_int32_me_signed(raw_mut.data(), 40);
    if (sweep_negative) sweep_val = -sweep_val;

    double sweep_ang = (sweep_val == 0) ? 360.0 : sweep_val / 360000.0;

    double primary = vax_to_ieee(raw, 44) * scale_;
    double secondary = vax_to_ieee(raw, 52) * scale_;
    double rotation = 0;
    std::tuple<double, double, double> origin;

    if (dimension_ == 2) {
        rotation = read_int32_me_signed(raw, 60) / 360000.0;
        double ox = vax_to_ieee(raw, 64);
        double oy = vax_to_ieee(raw, 72);
        origin = transform_point(ox, oy);
    } else {
        double ox = vax_to_ieee(raw, 76);
        double oy = vax_to_ieee(raw, 84);
        double oz = vax_to_ieee(raw, 92);
        origin = transform_point(ox, oy, oz);
        rotation = 0.0;
    }

    auto [ox, oy, oz] = origin;
    return nlohmann::json::object({
        {"primary_axis", primary}, {"secondary_axis", secondary},
        {"rotation", rotation},
        {"origin", nlohmann::json::array({ox, oy, oz})},
        {"start_angle", start_ang}, {"sweep_angle", sweep_ang},
    });
}

nlohmann::json DgnParser::parse_text_element(const uint8_t* raw, size_t raw_size) {
    int font_id = raw[36];
    int justification = raw[37];
    double length_mult = read_int32_me_signed(raw, 38) * scale_ * 6.0 / 1000.0;
    double height_mult = read_int32_me_signed(raw, 42) * scale_ * 6.0 / 1000.0;

    double rotation = 0;
    std::tuple<double, double, double> origin;
    int num_chars = 0;
    size_t text_off = 0;

    if (dimension_ == 2) {
        rotation = read_int32_me_signed(raw, 46) / 360000.0;
        double ox = read_int32_me_signed(raw, 50);
        double oy = read_int32_me_signed(raw, 54);
        origin = transform_point(ox, oy);
        num_chars = (raw_size > 58) ? raw[58] : 0;
        text_off = 60;
    } else {
        double ox = read_int32_me_signed(raw, 62);
        double oy = read_int32_me_signed(raw, 66);
        double oz = read_int32_me_signed(raw, 70);
        origin = transform_point(ox, oy, oz);
        num_chars = (raw_size > 74) ? raw[74] : 0;
        text_off = 76;
    }

    std::string text;
    if (text_off + num_chars <= raw_size) {
        text.assign(reinterpret_cast<const char*>(raw + text_off), num_chars);
        // Remove trailing null bytes
        while (!text.empty() && text.back() == '\0') text.pop_back();
    }

    auto [ox, oy, oz] = origin;
    return nlohmann::json::object({
        {"text", text}, {"font_id", font_id},
        {"justification", justification},
        {"height", height_mult}, {"width", length_mult},
        {"rotation", rotation},
        {"origin", nlohmann::json::array({ox, oy, oz})},
    });
}

nlohmann::json DgnParser::parse_text_node(const uint8_t* raw, size_t raw_size) {
    int numelems = read_uint16_le(raw, 38);
    int font_id = raw[44];
    int justification = raw[45];
    double length_mult = read_int32_me_signed(raw, 50) * scale_ * 6.0 / 1000.0;
    double height_mult = read_int32_me_signed(raw, 54) * scale_ * 6.0 / 1000.0;

    double rotation = 0;
    std::tuple<double, double, double> origin;

    if (dimension_ == 2) {
        rotation = read_int32_me_signed(raw, 58) / 360000.0;
        double ox = read_int32_me_signed(raw, 62);
        double oy = read_int32_me_signed(raw, 66);
        origin = transform_point(ox, oy);
    } else {
        double ox = read_int32_me_signed(raw, 74);
        double oy = read_int32_me_signed(raw, 78);
        double oz = read_int32_me_signed(raw, 82);
        origin = transform_point(ox, oy, oz);
    }

    auto [ox, oy, oz] = origin;
    return nlohmann::json::object({
        {"numelems", numelems}, {"font_id", font_id},
        {"justification", justification},
        {"height", height_mult}, {"width", length_mult},
        {"rotation", rotation},
        {"origin", nlohmann::json::array({ox, oy, oz})},
    });
}

nlohmann::json DgnParser::parse_cell_header(const uint8_t* raw, size_t raw_size) {
    int totlength = read_uint16_le(raw, 36);

    // Radix-50 name
    std::string name;
    try {
        uint16_t w1 = read_uint16_le(raw, 38);
        uint16_t w2 = read_uint16_le(raw, 40);
        name = rad50_to_ascii(w1) + rad50_to_ascii(w2);
        while (!name.empty() && name.back() == ' ') name.pop_back();
    } catch (...) {}

    int cclass = read_uint16_le(raw, 42);
    std::tuple<double, double, double> origin;
    double xscale = 1.0, yscale = 1.0, rotation = 0.0;

    if (dimension_ == 2) {
        double a = read_int32_me_signed(raw, 68);
        double b = read_int32_me_signed(raw, 72);
        double c = read_int32_me_signed(raw, 76);
        double d = read_int32_me_signed(raw, 80);

        double ox = read_int32_me_signed(raw, 84);
        double oy = read_int32_me_signed(raw, 88);
        origin = transform_point(ox, oy);

        double a2 = a * a, c2 = c * c;
        xscale = (a2 + c2 > 0) ? std::sqrt(a2 + c2) / 214748.0 : 1.0;
        yscale = std::sqrt(b * b + d * d) / 214748.0;

        if (a2 + c2 <= 0.0) {
            rotation = 0.0;
        } else {
            rotation = std::acos(std::max(-1.0, std::min(1.0, a / std::sqrt(a2 + c2))));
            rotation = (b <= 0) ? (rotation * 180.0 / M_PI) : (360.0 - rotation * 180.0 / M_PI);
        }
    } else {
        double ox = read_int32_me_signed(raw, 112);
        double oy = read_int32_me_signed(raw, 116);
        double oz = read_int32_me_signed(raw, 120);
        origin = transform_point(ox, oy, oz);
    }

    auto [ox, oy, oz] = origin;
    return nlohmann::json::object({
        {"name", name}, {"totlength", totlength}, {"class", cclass},
        {"origin", nlohmann::json::array({ox, oy, oz})},
        {"xscale", xscale}, {"yscale", yscale}, {"rotation", rotation},
    });
}

nlohmann::json DgnParser::parse_complex_header(const uint8_t* raw, size_t raw_size) {
    int totlength = read_uint16_le(raw, 36);
    int numelems = read_uint16_le(raw, 38);
    nlohmann::json result = nlohmann::json::object({
        {"totlength", totlength}, {"numelems", numelems},
    });
    if (raw_size > 41) {
        result["surftype"] = raw[40];
        result["boundelms"] = raw[41] + 1;
    }
    return result;
}

nlohmann::json DgnParser::parse_tag_value(const uint8_t* raw, size_t raw_size) {
    if (raw_size < 156) return nlohmann::json::object();

    int tag_type = read_uint16_le(raw, 74);
    uint32_t tag_set;
    std::memcpy(&tag_set, raw + 68, 4);
    int tag_index = read_uint16_le(raw, 72);
    int tag_length = read_uint16_le(raw, 150);

    nlohmann::json result = nlohmann::json::object({
        {"tag_type", tag_type}, {"tag_set", static_cast<int>(tag_set)},
        {"tag_index", tag_index}, {"tag_length", tag_length},
    });

    if (tag_type == 1 && raw_size > 154) {
        size_t end = 154;
        while (end < raw_size && raw[end] != 0) ++end;
        result["value"] = std::string(reinterpret_cast<const char*>(raw + 154), end - 154);
    } else if (tag_type == 3 && raw_size >= 158) {
        int32_t val;
        std::memcpy(&val, raw + 154, 4);
        result["value"] = val;
    } else if (tag_type == 4 && raw_size >= 162) {
        result["value"] = vax_to_ieee(raw, 154);
    }

    return result;
}

// ---------------------------------------------------------------------------
// Radix-50
// ---------------------------------------------------------------------------

std::string DgnParser::rad50_to_ascii(uint16_t value) {
    static const char R50[] = " ABCDEFGHIJKLMNOPQRSTUVWXYZ$.%0123456789";
    std::string chars(3, ' ');
    for (int i = 2; i >= 0; --i) {
        int idx = value % 40;
        chars[i] = (idx < 40) ? R50[idx] : ' ';
        value /= 40;
    }
    return chars;
}

} // namespace ifcx
