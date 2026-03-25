#include "ifcx/dwg_parser.h"

#include <algorithm>
#include <cstring>
#include <set>

namespace ifcx {

// ---------------------------------------------------------------------------
// Version map
// ---------------------------------------------------------------------------

const std::map<std::string, std::string> DWG_VERSION_MAP = {
    {"AC1012", "R13"}, {"AC1014", "R14"}, {"AC1015", "R2000"},
    {"AC1018", "R2004"}, {"AC1021", "R2007"}, {"AC1024", "R2010"},
    {"AC1027", "R2013"}, {"AC1032", "R2018"},
};

// ---------------------------------------------------------------------------
// Object type names
// ---------------------------------------------------------------------------

const std::map<int, std::string> DWG_OBJ_TYPE_NAMES = {
    {0x01, "TEXT"}, {0x02, "ATTRIB"}, {0x03, "ATTDEF"},
    {0x04, "BLOCK"}, {0x05, "ENDBLK"}, {0x06, "SEQEND"},
    {0x07, "INSERT"}, {0x08, "MINSERT"},
    {0x0A, "VERTEX_2D"}, {0x0B, "VERTEX_3D"},
    {0x0C, "VERTEX_MESH"}, {0x0D, "VERTEX_PFACE"},
    {0x0E, "VERTEX_PFACE_FACE"}, {0x0F, "POLYLINE_2D"},
    {0x10, "POLYLINE_3D"}, {0x11, "ARC"}, {0x12, "CIRCLE"},
    {0x13, "LINE"}, {0x14, "DIMENSION_ORDINATE"},
    {0x15, "DIMENSION_LINEAR"}, {0x16, "DIMENSION_ALIGNED"},
    {0x17, "DIMENSION_ANG3PT"}, {0x18, "DIMENSION_ANG2LN"},
    {0x19, "DIMENSION_RADIUS"}, {0x1A, "DIMENSION_DIAMETER"},
    {0x1B, "POINT"}, {0x1C, "3DFACE"},
    {0x1D, "POLYLINE_PFACE"}, {0x1E, "POLYLINE_MESH"},
    {0x1F, "SOLID"}, {0x20, "TRACE"}, {0x21, "SHAPE"},
    {0x22, "VIEWPORT"}, {0x23, "ELLIPSE"}, {0x24, "SPLINE"},
    {0x25, "REGION"}, {0x26, "3DSOLID"}, {0x27, "BODY"},
    {0x28, "RAY"}, {0x29, "XLINE"}, {0x2A, "DICTIONARY"},
    {0x2B, "OLEFRAME"}, {0x2C, "MTEXT"}, {0x2D, "LEADER"},
    {0x2E, "TOLERANCE"}, {0x2F, "MLINE"},
    {0x30, "BLOCK_CONTROL"}, {0x31, "BLOCK_HEADER"},
    {0x32, "LAYER_CONTROL"}, {0x33, "LAYER"},
    {0x34, "STYLE_CONTROL"}, {0x35, "STYLE"},
    {0x38, "LTYPE_CONTROL"}, {0x39, "LTYPE"},
    {0x3C, "VIEW_CONTROL"}, {0x3D, "VIEW"},
    {0x3E, "UCS_CONTROL"}, {0x3F, "UCS"},
    {0x40, "VPORT_CONTROL"}, {0x41, "VPORT"},
    {0x42, "APPID_CONTROL"}, {0x43, "APPID"},
    {0x44, "DIMSTYLE_CONTROL"}, {0x45, "DIMSTYLE"},
    {0x46, "VP_ENT_HDR_CONTROL"}, {0x47, "VP_ENT_HDR"},
    {0x48, "GROUP"}, {0x49, "MLINESTYLE"},
    {0x4A, "OLE2FRAME"}, {0x4C, "LONG_TRANSACTION"},
    {0x4D, "LWPOLYLINE"}, {0x4E, "HATCH"}, {0x4F, "XRECORD"},
    {0x50, "PLACEHOLDER"}, {0x51, "VBA_PROJECT"}, {0x52, "LAYOUT"},
};

// Entity type set
static const std::set<int> ENTITY_TYPES = {
    0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
    0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F, 0x10, 0x11,
    0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19,
    0x1A, 0x1B, 0x1C, 0x1D, 0x1E, 0x1F, 0x20, 0x21,
    0x22, 0x23, 0x24, 0x25, 0x26, 0x27, 0x28, 0x29,
    0x2C, 0x2D, 0x2E, 0x2F, 0x4D, 0x4E,
};

static const std::set<int> TABLE_CONTROL_TYPES = {
    0x30, 0x32, 0x34, 0x38, 0x3C, 0x3E, 0x40, 0x42, 0x44, 0x46,
};

static const std::set<int> TABLE_ENTRY_TYPES = {
    0x31, 0x33, 0x35, 0x39, 0x3D, 0x3F, 0x41, 0x43, 0x45, 0x47,
};

static const std::set<int> NON_ENTITY_TYPES = {
    0x2A, 0x48, 0x49, 0x4F, 0x50, 0x51, 0x52,
};

// ---------------------------------------------------------------------------
// Sentinels
// ---------------------------------------------------------------------------

const uint8_t HEADER_SENTINEL_START[16] = {
    0xCF, 0x7B, 0x1F, 0x23, 0xFD, 0xDE, 0x38, 0xA9,
    0x5F, 0x7C, 0x68, 0xB8, 0x4E, 0x6D, 0x33, 0x5F,
};

const uint8_t HEADER_SENTINEL_END[16] = {
    0x30, 0x84, 0xE0, 0xDC, 0x02, 0x21, 0xC7, 0x56,
    0xA0, 0x83, 0x97, 0x47, 0xB1, 0x92, 0xCC, 0xA0,
};

const uint8_t CLASSES_SENTINEL_START[16] = {
    0x8D, 0xA1, 0xC4, 0xB8, 0xC4, 0xA9, 0xF8, 0xC5,
    0xC0, 0xDC, 0xF4, 0x5F, 0xE7, 0xCF, 0xB6, 0x8A,
};

const uint8_t CLASSES_SENTINEL_END[16] = {
    0x72, 0x5E, 0x3B, 0x47, 0x3B, 0x56, 0x07, 0x3A,
    0x3F, 0x23, 0x0B, 0xA0, 0x18, 0x30, 0x49, 0x75,
};

// Section record IDs
static constexpr int SECTION_HEADER = 0;
static constexpr int SECTION_CLASSES = 1;
static constexpr int SECTION_OBJECT_MAP = 2;

// ---------------------------------------------------------------------------
// DwgParser
// ---------------------------------------------------------------------------

DwgParser::DwgParser() = default;

DwgFile DwgParser::parse(const uint8_t* data, size_t size) {
    if (size < 25) {
        throw std::runtime_error("Data too short to be a valid DWG file");
    }
    DwgFile dwg;
    dwg.version_code = detect_version(data, size);
    auto vit = DWG_VERSION_MAP.find(dwg.version_code);
    dwg.version = (vit != DWG_VERSION_MAP.end()) ? vit->second : dwg.version_code;

    if (dwg.version_code == "AC1015") {
        parse_r2000(data, size, dwg);
    } else {
        // For other versions, we do best-effort R2000 parsing
        // (many versions share the same basic structure)
        try {
            parse_r2000(data, size, dwg);
        } catch (...) {
            // Graceful degradation
        }
    }
    return dwg;
}

DwgFile DwgParser::parse(const std::vector<uint8_t>& data) {
    return parse(data.data(), data.size());
}

std::string DwgParser::detect_version(const uint8_t* data, size_t size) {
    if (size < 6) return "";
    return std::string(reinterpret_cast<const char*>(data), 6);
}

// ---------------------------------------------------------------------------
// R2000 parsing
// ---------------------------------------------------------------------------

void DwgParser::parse_r2000(const uint8_t* data, size_t size, DwgFile& dwg) {
    if (size < 21) return;
    uint16_t codepage;
    std::memcpy(&codepage, data + 19, 2);
    dwg.codepage = codepage;

    auto sections = parse_section_locators_r2000(data, size);

    auto cls_it = sections.find(SECTION_CLASSES);
    if (cls_it != sections.end()) {
        auto [offset, sec_size] = cls_it->second;
        dwg.classes = parse_classes_r2000(data, size, offset, sec_size);
        for (auto& cls : dwg.classes) {
            class_map_[cls.class_number] = cls;
        }
    }

    auto hdr_it = sections.find(SECTION_HEADER);
    if (hdr_it != sections.end()) {
        auto [offset, sec_size] = hdr_it->second;
        dwg.header_vars = parse_header_vars_r2000(data, size, offset, sec_size);
    }

    auto map_it = sections.find(SECTION_OBJECT_MAP);
    if (map_it != sections.end()) {
        auto [offset, sec_size] = map_it->second;
        dwg.object_map = parse_object_map_r2000(data, size, offset, sec_size);
    }

    if (!dwg.object_map.empty()) {
        dwg.objects = parse_objects_r2000(data, size, dwg.object_map, dwg.classes);
    }

    for (auto& obj : dwg.objects) {
        if (obj.type_name == "LAYER") {
            dwg.layers[obj.handle] = obj.data;
        } else if (obj.type_name == "BLOCK_HEADER") {
            dwg.blocks[obj.handle] = obj.data;
        }
    }
}

std::map<int, std::pair<size_t, size_t>> DwgParser::parse_section_locators_r2000(
    const uint8_t* data, size_t size) {
    int32_t num_records;
    std::memcpy(&num_records, data + 21, 4);
    std::map<int, std::pair<size_t, size_t>> sections;

    for (int i = 0; i < num_records; ++i) {
        size_t off = 25 + i * 9;
        if (off + 9 > size) break;
        uint8_t rec_num = data[off];
        uint32_t seeker, sec_size;
        std::memcpy(&seeker, data + off + 1, 4);
        std::memcpy(&sec_size, data + off + 5, 4);
        if (seeker > 0 || rec_num == 0) {
            sections[rec_num] = {seeker, sec_size};
        }
    }
    return sections;
}

// ---------------------------------------------------------------------------
// Header variables
// ---------------------------------------------------------------------------

nlohmann::json DwgParser::parse_header_vars_r2000(const uint8_t* data, size_t size,
                                                    size_t offset, size_t sec_size) {
    nlohmann::json header = nlohmann::json::object();
    header["$ACADVER"] = "AC1015";

    if (offset + 20 > size) return header;

    // Check sentinel
    // (skip sentinel validation for robustness)

    uint32_t hdr_data_size;
    std::memcpy(&hdr_data_size, data + offset + 16, 4);

    DwgBitReader reader(data, size, offset + 20);

    try {
        // Skip unknown values
        reader.read_BD(); reader.read_BD(); reader.read_BD(); reader.read_BD();
        reader.read_T(); reader.read_T(); reader.read_T(); reader.read_T();
        reader.read_BL(); reader.read_BL();

        header["$DIMASO"] = reader.read_bit();
        header["$DIMSHO"] = reader.read_bit();
        header["$PLINEGEN"] = reader.read_bit();
        header["$ORTHOMODE"] = reader.read_bit();
        header["$REGENMODE"] = reader.read_bit();
        header["$FILLMODE"] = reader.read_bit();
        header["$QTEXTMODE"] = reader.read_bit();
        header["$PSLTSCALE"] = reader.read_bit();
        header["$LIMCHECK"] = reader.read_bit();
        header["$USRTIMER"] = reader.read_bit();
        header["$SKPOLY"] = reader.read_bit();
        header["$ANGDIR"] = reader.read_bit();
        header["$SPLFRAME"] = reader.read_bit();
        header["$MIRRTEXT"] = reader.read_bit();
        header["$WORLDVIEW"] = reader.read_bit();
        header["$TILEMODE"] = reader.read_bit();
        header["$PLIMCHECK"] = reader.read_bit();
        header["$VISRETAIN"] = reader.read_bit();
        header["$DISPSILH"] = reader.read_bit();
        header["$PELLIPSE"] = reader.read_bit();
        header["$PROXYGRAPHICS"] = reader.read_BS();
        header["$TREEDEPTH"] = reader.read_BS();
        header["$LUNITS"] = reader.read_BS();
        header["$LUPREC"] = reader.read_BS();
        header["$AUNITS"] = reader.read_BS();
        header["$AUPREC"] = reader.read_BS();
        header["$OSMODE"] = reader.read_BS();
        header["$ATTMODE"] = reader.read_BS();
        header["$COORDS"] = reader.read_BS();
        header["$PDMODE"] = reader.read_BS();
        header["$PICKSTYLE"] = reader.read_BS();
        // Skip user integers
        for (int i = 0; i < 5; ++i) reader.read_BS();
        header["$SPLINESEGS"] = reader.read_BS();
        header["$SURFU"] = reader.read_BS();
        header["$SURFV"] = reader.read_BS();
        header["$SURFTYPE"] = reader.read_BS();
        header["$SURFTAB1"] = reader.read_BS();
        header["$SURFTAB2"] = reader.read_BS();
        header["$SPLINETYPE"] = reader.read_BS();
        header["$SHADEDGE"] = reader.read_BS();
        header["$SHADEDIF"] = reader.read_BS();
        header["$UNITMODE"] = reader.read_BS();
        header["$MAXACTVP"] = reader.read_BS();
        header["$ISOLINES"] = reader.read_BS();
        header["$CMLJUST"] = reader.read_BS();
        header["$TEXTQLTY"] = reader.read_BS();
        header["$LTSCALE"] = reader.read_BD();
        header["$TEXTSIZE"] = reader.read_BD();
        header["$TRACEWID"] = reader.read_BD();
        header["$SKETCHINC"] = reader.read_BD();
        header["$FILLETRAD"] = reader.read_BD();
        header["$THICKNESS"] = reader.read_BD();
        header["$ANGBASE"] = reader.read_BD();
        header["$PDSIZE"] = reader.read_BD();
        header["$PLINEWID"] = reader.read_BD();
        // Skip user reals
        for (int i = 0; i < 5; ++i) reader.read_BD();
        header["$CMLSCALE"] = reader.read_BD();
        header["$CEPSNTYPE"] = reader.read_BS();
    } catch (...) {
        // Stop gracefully on parse error
    }

    return header;
}

// ---------------------------------------------------------------------------
// Classes
// ---------------------------------------------------------------------------

std::vector<DwgClass> DwgParser::parse_classes_r2000(const uint8_t* data, size_t size,
                                                       size_t offset, size_t sec_size) {
    std::vector<DwgClass> classes;
    if (offset + 20 > size) return classes;

    uint32_t cls_data_size;
    std::memcpy(&cls_data_size, data + offset + 16, 4);

    DwgBitReader reader(data, size, offset + 20);
    size_t end_byte = offset + 20 + cls_data_size;

    while (reader.tell_byte() < end_byte) {
        try {
            DwgClass cls;
            cls.class_number = reader.read_BS();
            cls.proxy_flags = reader.read_BS();
            cls.app_name = reader.read_T();
            cls.cpp_class_name = reader.read_T();
            cls.dxf_name = reader.read_T();
            cls.was_zombie = reader.read_bit() != 0;
            cls.item_class_id = reader.read_BS();
            classes.push_back(std::move(cls));
        } catch (...) {
            break;
        }
    }
    return classes;
}

// ---------------------------------------------------------------------------
// Object map
// ---------------------------------------------------------------------------

std::map<uint32_t, size_t> DwgParser::parse_object_map_r2000(const uint8_t* data, size_t size,
                                                               size_t offset, size_t sec_size) {
    std::map<uint32_t, size_t> object_map;
    size_t pos = offset;
    size_t end = offset + sec_size;

    int32_t last_handle = 0;
    int32_t last_loc = 0;

    while (pos < end) {
        if (pos + 2 > size) break;
        uint16_t section_size = (static_cast<uint16_t>(data[pos]) << 8) | data[pos + 1];
        if (section_size <= 2) break;

        size_t body_start = pos + 2;
        size_t body_end = body_start + section_size - 2;
        size_t rpos = body_start;

        while (rpos < body_end) {
            try {
                auto [handle_delta, new_pos1] = DwgBitReader::read_modular_char(data, size, rpos);
                rpos = new_pos1;
                auto [loc_delta, new_pos2] = DwgBitReader::read_modular_char(data, size, rpos);
                rpos = new_pos2;

                last_handle += handle_delta;
                last_loc += loc_delta;

                if (last_handle > 0) {
                    object_map[static_cast<uint32_t>(last_handle)] = static_cast<size_t>(last_loc);
                }
            } catch (...) {
                break;
            }
        }

        pos += 2 + section_size;
    }
    return object_map;
}

// ---------------------------------------------------------------------------
// Object/entity parsing
// ---------------------------------------------------------------------------

std::vector<DwgObject> DwgParser::parse_objects_r2000(
    const uint8_t* data, size_t size,
    const std::map<uint32_t, size_t>& object_map,
    const std::vector<DwgClass>& classes) {
    std::vector<DwgObject> objects;

    for (auto& [handle, file_offset] : object_map) {
        try {
            auto obj = parse_single_object_r2000(data, size, handle, file_offset);
            if (obj) objects.push_back(std::move(*obj));
        } catch (...) {
            // Skip failed objects
        }
    }
    return objects;
}

std::optional<DwgObject> DwgParser::parse_single_object_r2000(
    const uint8_t* data, size_t size, uint32_t handle, size_t file_offset) {
    if (file_offset >= size) return std::nullopt;

    auto [obj_size, bit_start] = DwgBitReader::read_modular_short(data, size, file_offset);
    if (obj_size <= 0) return std::nullopt;

    DwgBitReader reader(data, size, bit_start);
    int type_num = reader.read_BS();

    // Determine type name
    std::string type_name;
    auto it = DWG_OBJ_TYPE_NAMES.find(type_num);
    if (it != DWG_OBJ_TYPE_NAMES.end()) {
        type_name = it->second;
    } else if (type_num >= 500) {
        auto cit = class_map_.find(type_num);
        if (cit != class_map_.end()) {
            type_name = cit->second.dxf_name.empty() ?
                        cit->second.cpp_class_name : cit->second.dxf_name;
        }
    }
    if (type_name.empty()) {
        type_name = "UNKNOWN_" + std::to_string(type_num);
    }

    // Determine if entity
    bool is_entity = ENTITY_TYPES.count(type_num) &&
                     !TABLE_CONTROL_TYPES.count(type_num) &&
                     !TABLE_ENTRY_TYPES.count(type_num) &&
                     !NON_ENTITY_TYPES.count(type_num);
    if (type_num >= 500 && !is_entity) {
        auto cit = class_map_.find(type_num);
        if (cit != class_map_.end() && cit->second.item_class_id == 0x1F2) {
            is_entity = true;
        }
    }

    DwgObject obj;
    obj.handle = handle;
    obj.type_num = type_num;
    obj.type_name = type_name;
    obj.is_entity = is_entity;

    // Read bitsize
    try {
        reader.read_raw_long(); // bitsize
    } catch (...) {
        obj.data = nlohmann::json::object({{"type", type_name}, {"handle", static_cast<int>(handle)}});
        return obj;
    }

    // Read handle
    try { reader.read_H(); } catch (...) {}

    // Skip EED
    try { skip_eed(reader); } catch (...) {}

    // Parse type-specific data
    try {
        if (is_entity) {
            obj.data = parse_entity_data(reader, type_num, type_name, obj_size);
        } else {
            obj.data = parse_table_object(reader, type_num, type_name, obj_size);
        }
    } catch (...) {
        if (obj.data.is_null()) obj.data = nlohmann::json::object();
    }

    obj.data["type"] = type_name;
    obj.data["handle"] = static_cast<int>(handle);

    return obj;
}

void DwgParser::skip_eed(DwgBitReader& reader) {
    while (true) {
        int eed_size = reader.read_BS();
        if (eed_size == 0) break;
        reader.read_H();
        for (int i = 0; i < eed_size; ++i) {
            reader.read_byte();
        }
    }
}

// ---------------------------------------------------------------------------
// Entity common data
// ---------------------------------------------------------------------------

nlohmann::json DwgParser::parse_entity_common(DwgBitReader& reader) {
    nlohmann::json result = nlohmann::json::object();

    int preview_exists = reader.read_bit();
    if (preview_exists) {
        uint32_t preview_size = reader.read_raw_long();
        if (preview_size > 0 && preview_size < 5000000) {
            for (uint32_t i = 0; i < preview_size; ++i) reader.read_byte();
        }
    }

    result["entity_mode"] = reader.read_BB();
    result["_num_reactors"] = reader.read_BL();
    reader.read_bit(); // nolinks
    result["color"] = reader.read_CMC();
    result["linetype_scale"] = reader.read_BD();
    reader.read_BB(); // ltype flags
    reader.read_BB(); // plotstyle flags
    int invisibility = reader.read_BS();
    result["invisible"] = invisibility != 0;
    result["lineweight"] = reader.read_byte();

    return result;
}

// ---------------------------------------------------------------------------
// Entity data dispatch
// ---------------------------------------------------------------------------

nlohmann::json DwgParser::parse_entity_data(DwgBitReader& reader, int type_num,
                                              const std::string& type_name, int obj_size) {
    nlohmann::json common;
    try { common = parse_entity_common(reader); } catch (...) {}

    nlohmann::json specific;
    try {
        switch (type_num) {
            case 0x13: specific = parse_line(reader); break;
            case 0x12: specific = parse_circle(reader); break;
            case 0x11: specific = parse_arc(reader); break;
            case 0x1B: specific = parse_point_entity(reader); break;
            case 0x4D: specific = parse_lwpolyline(reader); break;
            case 0x01: specific = parse_text_entity(reader); break;
            case 0x2C: specific = parse_mtext(reader); break;
            case 0x07: specific = parse_insert(reader); break;
            case 0x23: specific = parse_ellipse(reader); break;
            case 0x24: specific = parse_spline(reader); break;
            case 0x1F: specific = parse_solid(reader); break;
            case 0x28: specific = parse_ray(reader); break;
            case 0x29: specific = parse_xline(reader); break;
            default: specific = nlohmann::json::object(); break;
        }
    } catch (...) {
        specific = nlohmann::json::object();
    }

    // Merge common and specific
    if (!common.is_null() && common.is_object()) {
        for (auto& [key, val] : common.items()) {
            if (!specific.contains(key)) specific[key] = val;
        }
    }
    return specific;
}

// ---------------------------------------------------------------------------
// Geometric entity parsers
// ---------------------------------------------------------------------------

nlohmann::json DwgParser::parse_line(DwgBitReader& reader) {
    int z_is_zero = reader.read_bit();
    double sx = reader.read_double();
    double ex = reader.read_DD(sx);
    double sy = reader.read_double();
    double ey = reader.read_DD(sy);
    double sz = 0, ez = 0;
    if (!z_is_zero) {
        sz = reader.read_double();
        ez = reader.read_DD(sz);
    }
    double thickness = reader.read_BT();
    auto [ext_x, ext_y, ext_z] = reader.read_BE();
    return nlohmann::json::object({
        {"type", "LINE"},
        {"start", nlohmann::json::array({sx, sy, sz})},
        {"end", nlohmann::json::array({ex, ey, ez})},
        {"thickness", thickness},
        {"extrusion", nlohmann::json::array({ext_x, ext_y, ext_z})},
    });
}

nlohmann::json DwgParser::parse_circle(DwgBitReader& reader) {
    auto [cx, cy, cz] = reader.read_3BD();
    double radius = reader.read_BD();
    double thickness = reader.read_BT();
    auto [ex, ey, ez] = reader.read_BE();
    return nlohmann::json::object({
        {"type", "CIRCLE"},
        {"center", nlohmann::json::array({cx, cy, cz})},
        {"radius", radius},
        {"thickness", thickness},
        {"extrusion", nlohmann::json::array({ex, ey, ez})},
    });
}

nlohmann::json DwgParser::parse_arc(DwgBitReader& reader) {
    auto [cx, cy, cz] = reader.read_3BD();
    double radius = reader.read_BD();
    double thickness = reader.read_BT();
    auto [ex, ey, ez] = reader.read_BE();
    double start_angle = reader.read_BD();
    double end_angle = reader.read_BD();
    return nlohmann::json::object({
        {"type", "ARC"},
        {"center", nlohmann::json::array({cx, cy, cz})},
        {"radius", radius},
        {"thickness", thickness},
        {"extrusion", nlohmann::json::array({ex, ey, ez})},
        {"startAngle", start_angle},
        {"endAngle", end_angle},
    });
}

nlohmann::json DwgParser::parse_point_entity(DwgBitReader& reader) {
    double x = reader.read_BD();
    double y = reader.read_BD();
    double z = reader.read_BD();
    double thickness = reader.read_BT();
    auto [ex, ey, ez] = reader.read_BE();
    double x_ang = reader.read_BD();
    return nlohmann::json::object({
        {"type", "POINT"},
        {"position", nlohmann::json::array({x, y, z})},
        {"thickness", thickness},
        {"extrusion", nlohmann::json::array({ex, ey, ez})},
        {"xAxisAngle", x_ang},
    });
}

nlohmann::json DwgParser::parse_ellipse(DwgBitReader& reader) {
    auto [cx, cy, cz] = reader.read_3BD();
    auto [ax, ay, az] = reader.read_3BD();
    auto [ex, ey, ez] = reader.read_3BD();
    double ratio = reader.read_BD();
    double start_angle = reader.read_BD();
    double end_angle = reader.read_BD();
    return nlohmann::json::object({
        {"type", "ELLIPSE"},
        {"center", nlohmann::json::array({cx, cy, cz})},
        {"majorAxis", nlohmann::json::array({ax, ay, az})},
        {"extrusion", nlohmann::json::array({ex, ey, ez})},
        {"axisRatio", ratio},
        {"startAngle", start_angle},
        {"endAngle", end_angle},
    });
}

nlohmann::json DwgParser::parse_text_entity(DwgBitReader& reader) {
    uint8_t dataflags = reader.read_byte();
    double elevation = 0;
    if (!(dataflags & 0x01)) elevation = reader.read_double();
    auto [ix, iy] = reader.read_2RD();
    double ax = ix, ay = iy;
    if (!(dataflags & 0x02)) {
        ax = reader.read_DD(ix);
        ay = reader.read_DD(iy);
    }
    auto [ext_x, ext_y, ext_z] = reader.read_BE();
    double thickness = reader.read_BT();
    double oblique = 0;
    if (!(dataflags & 0x04)) oblique = reader.read_double();
    double rotation = 0;
    if (!(dataflags & 0x08)) rotation = reader.read_double();
    double height = reader.read_double();
    double wf = 1.0;
    if (!(dataflags & 0x10)) wf = reader.read_double();
    std::string text = reader.read_T();
    int gen = 0;
    if (!(dataflags & 0x20)) gen = reader.read_BS();
    int halign = 0;
    if (!(dataflags & 0x40)) halign = reader.read_BS();
    int valign = 0;
    if (!(dataflags & 0x80)) valign = reader.read_BS();

    return nlohmann::json::object({
        {"type", "TEXT"},
        {"elevation", elevation},
        {"insertion", nlohmann::json::array({ix, iy})},
        {"alignment", nlohmann::json::array({ax, ay})},
        {"extrusion", nlohmann::json::array({ext_x, ext_y, ext_z})},
        {"thickness", thickness},
        {"oblique", oblique},
        {"rotation", rotation},
        {"height", height},
        {"widthFactor", wf},
        {"text", text},
        {"horizontalAlignment", halign},
        {"verticalAlignment", valign},
    });
}

nlohmann::json DwgParser::parse_mtext(DwgBitReader& reader) {
    auto [ix, iy, iz] = reader.read_3BD();
    auto [ext_x, ext_y, ext_z] = reader.read_3BD();
    auto [xax, xay, xaz] = reader.read_3BD();
    double rect_width = reader.read_BD();
    double text_height = reader.read_BD();
    int attachment = reader.read_BS();
    int flow_dir = reader.read_BS();
    reader.read_BD(); // extents height
    reader.read_BD(); // extents width
    std::string text = reader.read_T();
    int lss = reader.read_BS();
    double lsf = reader.read_BD();
    reader.read_bit(); // unknown

    return nlohmann::json::object({
        {"type", "MTEXT"},
        {"insertion", nlohmann::json::array({ix, iy, iz})},
        {"extrusion", nlohmann::json::array({ext_x, ext_y, ext_z})},
        {"xAxisDirection", nlohmann::json::array({xax, xay, xaz})},
        {"rectWidth", rect_width},
        {"textHeight", text_height},
        {"attachment", attachment},
        {"flowDirection", flow_dir},
        {"text", text},
        {"lineSpacingStyle", lss},
        {"lineSpacingFactor", lsf},
    });
}

nlohmann::json DwgParser::parse_insert(DwgBitReader& reader) {
    auto [ix, iy, iz] = reader.read_3BD();
    int scale_flag = reader.read_BB();
    double sx = 1, sy = 1, sz = 1;
    if (scale_flag == 3) {
        // all 1.0
    } else if (scale_flag == 1) {
        sy = reader.read_DD(1.0);
        sz = reader.read_DD(1.0);
    } else if (scale_flag == 2) {
        sx = reader.read_double();
        sy = sx; sz = sx;
    } else {
        sx = reader.read_double();
        sy = reader.read_DD(sx);
        sz = reader.read_DD(sx);
    }
    double rotation = reader.read_BD();
    auto [ext_x, ext_y, ext_z] = reader.read_3BD();
    int has_attribs = reader.read_bit();

    return nlohmann::json::object({
        {"type", "INSERT"},
        {"insertion", nlohmann::json::array({ix, iy, iz})},
        {"scale", nlohmann::json::array({sx, sy, sz})},
        {"rotation", rotation},
        {"extrusion", nlohmann::json::array({ext_x, ext_y, ext_z})},
        {"hasAttribs", has_attribs != 0},
    });
}

nlohmann::json DwgParser::parse_lwpolyline(DwgBitReader& reader) {
    int flag = reader.read_BS();
    double const_width = 0;
    if (flag & 4) const_width = reader.read_BD();
    double elevation = 0;
    if (flag & 8) elevation = reader.read_BD();
    double thickness = 0;
    if (flag & 2) thickness = reader.read_BD();
    double nx = 0, ny = 0, nz = 1.0;
    if (flag & 1) {
        auto [x, y, z] = reader.read_3BD();
        nx = x; ny = y; nz = z;
    }
    int num_points = reader.read_BL();
    int num_bulges = 0;
    if (flag & 16) num_bulges = reader.read_BL();
    int num_widths = 0;
    if (flag & 32) num_widths = reader.read_BL();

    auto vertices = nlohmann::json::array();
    double prev_x = 0, prev_y = 0;
    for (int i = 0; i < num_points; ++i) {
        double x, y;
        if (i == 0) {
            auto [px, py] = reader.read_2RD();
            x = px; y = py;
        } else {
            x = reader.read_DD(prev_x);
            y = reader.read_DD(prev_y);
        }
        vertices.push_back(nlohmann::json::object({{"x", x}, {"y", y}}));
        prev_x = x; prev_y = y;
    }

    auto bulges = nlohmann::json::array();
    for (int i = 0; i < num_bulges; ++i) {
        bulges.push_back(reader.read_BD());
    }

    // Apply bulges to vertices
    for (int i = 0; i < num_bulges && i < static_cast<int>(vertices.size()); ++i) {
        double b = bulges[i].get<double>();
        if (b != 0) vertices[i]["bulge"] = b;
    }

    return nlohmann::json::object({
        {"type", "LWPOLYLINE"},
        {"closed", (flag & 512) != 0},
        {"vertices", vertices},
        {"elevation", elevation},
        {"thickness", thickness},
        {"extrusion", nlohmann::json::array({nx, ny, nz})},
    });
}

nlohmann::json DwgParser::parse_spline(DwgBitReader& reader) {
    // Simplified spline parsing
    int degree = reader.read_BL();
    int num_knots = reader.read_BL();
    int num_ctrl = reader.read_BL();
    int num_fit = reader.read_BL();

    auto knots = nlohmann::json::array();
    for (int i = 0; i < num_knots; ++i) knots.push_back(reader.read_BD());

    auto ctrl_pts = nlohmann::json::array();
    for (int i = 0; i < num_ctrl; ++i) {
        auto [x, y, z] = reader.read_3BD();
        ctrl_pts.push_back(nlohmann::json::array({x, y, z}));
    }

    auto fit_pts = nlohmann::json::array();
    for (int i = 0; i < num_fit; ++i) {
        auto [x, y, z] = reader.read_3BD();
        fit_pts.push_back(nlohmann::json::array({x, y, z}));
    }

    return nlohmann::json::object({
        {"type", "SPLINE"},
        {"degree", degree},
        {"knots", knots},
        {"controlPoints", ctrl_pts},
        {"fitPoints", fit_pts},
    });
}

nlohmann::json DwgParser::parse_solid(DwgBitReader& reader) {
    double thickness = reader.read_BT();
    double elevation = reader.read_BD();
    auto corners = nlohmann::json::array();
    for (int i = 0; i < 4; ++i) {
        auto [x, y] = reader.read_2RD();
        corners.push_back(nlohmann::json::array({x, y, elevation}));
    }
    auto [ex, ey, ez] = reader.read_BE();
    return nlohmann::json::object({
        {"type", "SOLID"},
        {"corners", corners},
        {"thickness", thickness},
        {"extrusion", nlohmann::json::array({ex, ey, ez})},
    });
}

nlohmann::json DwgParser::parse_ray(DwgBitReader& reader) {
    auto [px, py, pz] = reader.read_3BD();
    auto [dx, dy, dz] = reader.read_3BD();
    return nlohmann::json::object({
        {"type", "RAY"},
        {"basePoint", nlohmann::json::array({px, py, pz})},
        {"direction", nlohmann::json::array({dx, dy, dz})},
    });
}

nlohmann::json DwgParser::parse_xline(DwgBitReader& reader) {
    auto [px, py, pz] = reader.read_3BD();
    auto [dx, dy, dz] = reader.read_3BD();
    return nlohmann::json::object({
        {"type", "XLINE"},
        {"basePoint", nlohmann::json::array({px, py, pz})},
        {"direction", nlohmann::json::array({dx, dy, dz})},
    });
}

// ---------------------------------------------------------------------------
// Table object parsers
// ---------------------------------------------------------------------------

nlohmann::json DwgParser::parse_table_object(DwgBitReader& reader, int type_num,
                                               const std::string& type_name, int obj_size) {
    try {
        if (type_num == 0x33) return parse_layer_object(reader);
        if (type_num == 0x35) return parse_style_object(reader);
        if (type_num == 0x39) return parse_ltype_object(reader);
        if (type_num == 0x31) return parse_block_header_object(reader);
        if (type_num == 0x2A) return parse_dictionary_object(reader);
    } catch (...) {}
    return nlohmann::json::object();
}

nlohmann::json DwgParser::parse_layer_object(DwgBitReader& reader) {
    nlohmann::json result = nlohmann::json::object();
    // Common non-entity data
    reader.read_BL(); // num reactors
    result["name"] = reader.read_T();
    int bit64 = reader.read_bit();
    int xrefref = reader.read_BS();
    // R2000+: xdep flag
    reader.read_bit();
    // Layer-specific
    int flags = reader.read_BS();
    result["frozen"] = (flags & 1) != 0;
    result["off"] = (flags & 2) != 0;
    // For frozen-in-new-VP, flags bit 4 is sometimes used
    result["locked"] = (flags & 4) != 0;
    result["color"] = reader.read_CMC();
    return result;
}

nlohmann::json DwgParser::parse_style_object(DwgBitReader& reader) {
    nlohmann::json result = nlohmann::json::object();
    reader.read_BL();
    result["name"] = reader.read_T();
    reader.read_bit(); // 64 flag
    reader.read_BS();  // xrefref
    reader.read_bit();  // xdep
    // Style-specific
    int flags = reader.read_BS();
    result["fixedHeight"] = reader.read_BD();
    result["widthFactor"] = reader.read_BD();
    reader.read_BD(); // oblique
    reader.read_byte(); // generation
    reader.read_BD(); // last height
    result["fontName"] = reader.read_T();
    result["bigFontName"] = reader.read_T();
    return result;
}

nlohmann::json DwgParser::parse_ltype_object(DwgBitReader& reader) {
    nlohmann::json result = nlohmann::json::object();
    reader.read_BL();
    result["name"] = reader.read_T();
    reader.read_bit();
    reader.read_BS();
    reader.read_bit();
    result["description"] = reader.read_T();
    result["patternLength"] = reader.read_BD();
    reader.read_byte(); // alignment
    int numDashes = reader.read_byte();
    auto pattern = nlohmann::json::array();
    for (int i = 0; i < numDashes; ++i) {
        pattern.push_back(reader.read_BD());
        reader.read_BS(); // complex
        reader.read_BD(); // x offset
        reader.read_BD(); // y offset
        reader.read_BD(); // scale
        reader.read_BD(); // rotation
        reader.read_BS(); // shape flag
    }
    result["pattern"] = pattern;
    return result;
}

nlohmann::json DwgParser::parse_block_header_object(DwgBitReader& reader) {
    nlohmann::json result = nlohmann::json::object();
    reader.read_BL();
    result["name"] = reader.read_T();
    reader.read_bit();
    reader.read_BS();
    reader.read_bit();
    // Block header specific
    int anon = reader.read_bit();
    result["anonymous"] = anon != 0;
    int has_attribs = reader.read_bit();
    result["hasAttribs"] = has_attribs != 0;
    int blk_is_xref = reader.read_bit();
    result["isXRef"] = blk_is_xref != 0;
    int xrefov = reader.read_bit();
    reader.read_bit(); // loaded
    return result;
}

nlohmann::json DwgParser::parse_dictionary_object(DwgBitReader& reader) {
    nlohmann::json result = nlohmann::json::object();
    int num_items = reader.read_BL();
    // R14+: cloning flag, hardowner flag
    reader.read_BS(); // cloning
    reader.read_byte(); // hardowner

    auto entries = nlohmann::json::object();
    for (int i = 0; i < num_items; ++i) {
        try {
            std::string name = reader.read_T();
            entries[name] = nullptr; // Handle refs are read separately
        } catch (...) { break; }
    }
    result["entries"] = entries;
    return result;
}

} // namespace ifcx
