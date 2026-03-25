#ifndef IFCX_DWG_PARSER_H
#define IFCX_DWG_PARSER_H

#include <cstdint>
#include <map>
#include <optional>
#include <string>
#include <tuple>
#include <vector>

#include <nlohmann/json.hpp>

namespace ifcx {

// ---------------------------------------------------------------------------
// DwgBitReader -- bit-level reader for DWG binary format
// ---------------------------------------------------------------------------

class DwgBitReader {
public:
    DwgBitReader(const uint8_t* data, size_t size, size_t byte_offset = 0);
    DwgBitReader(const std::vector<uint8_t>& data, size_t byte_offset = 0);

    // Low-level bit reading
    int read_bit();
    uint32_t read_bits(int count);

    // Raw fixed-size types
    uint8_t read_byte();
    int16_t read_short();
    uint16_t read_raw_short();
    int32_t read_long();
    uint32_t read_raw_long();
    double read_double();

    // DWG compressed types
    int read_BB();
    int read_BS();
    int32_t read_BL();
    double read_BD();
    double read_DD(double default_val);
    double read_BT();
    std::tuple<double, double, double> read_BE();

    // Handle references
    std::pair<int, uint32_t> read_H();

    // Text strings
    std::string read_T(bool is_unicode = false);

    // Point helpers
    std::pair<double, double> read_2RD();
    std::tuple<double, double, double> read_3RD();
    std::pair<double, double> read_2BD();
    std::tuple<double, double, double> read_3BD();

    // Color
    int read_CMC();

    // Modular char / modular short (static -- work on raw data)
    static std::pair<int32_t, size_t> read_modular_char(const uint8_t* data, size_t size, size_t pos);
    static std::pair<uint32_t, size_t> read_modular_short(const uint8_t* data, size_t size, size_t pos);

    // Positioning
    void seek_byte(size_t offset);
    void seek_bit(size_t bit_offset);
    size_t tell_byte() const;
    size_t tell_bit() const;
    void align_byte();
    size_t remaining_bytes() const;
    std::vector<uint8_t> read_raw_bytes(size_t count);

private:
    const uint8_t* data_;
    size_t size_;
    size_t bit_position_;
};

// ---------------------------------------------------------------------------
// DWG data model
// ---------------------------------------------------------------------------

/// Version code to human-readable name mapping.
extern const std::map<std::string, std::string> DWG_VERSION_MAP;

/// Object type number to name mapping.
extern const std::map<int, std::string> DWG_OBJ_TYPE_NAMES;

struct DwgClass {
    int class_number = 0;
    int proxy_flags = 0;
    std::string app_name;
    std::string cpp_class_name;
    std::string dxf_name;
    bool was_zombie = false;
    int item_class_id = 0;
};

struct DwgObject {
    uint32_t handle = 0;
    int type_num = 0;
    std::string type_name;
    nlohmann::json data;
    bool is_entity = false;
};

struct DwgFile {
    std::string version;
    std::string version_code;
    int codepage = 0;
    nlohmann::json header_vars;
    std::vector<DwgClass> classes;
    std::vector<DwgObject> objects;
    std::map<uint32_t, size_t> object_map; // handle -> file offset
    std::map<uint32_t, nlohmann::json> layers;
    std::map<uint32_t, nlohmann::json> blocks;
};

// ---------------------------------------------------------------------------
// DwgParser
// ---------------------------------------------------------------------------

class DwgParser {
public:
    DwgParser();

    /// Parse a DWG file from raw bytes.
    DwgFile parse(const uint8_t* data, size_t size);
    DwgFile parse(const std::vector<uint8_t>& data);

private:
    std::map<int, DwgClass> class_map_;

    std::string detect_version(const uint8_t* data, size_t size);

    // R2000 parsing
    void parse_r2000(const uint8_t* data, size_t size, DwgFile& dwg);
    std::map<int, std::pair<size_t, size_t>> parse_section_locators_r2000(
        const uint8_t* data, size_t size);
    nlohmann::json parse_header_vars_r2000(const uint8_t* data, size_t size,
                                           size_t offset, size_t sec_size);
    std::vector<DwgClass> parse_classes_r2000(const uint8_t* data, size_t size,
                                              size_t offset, size_t sec_size);
    std::map<uint32_t, size_t> parse_object_map_r2000(const uint8_t* data, size_t size,
                                                       size_t offset, size_t sec_size);
    std::vector<DwgObject> parse_objects_r2000(const uint8_t* data, size_t size,
                                               const std::map<uint32_t, size_t>& object_map,
                                               const std::vector<DwgClass>& classes);
    std::optional<DwgObject> parse_single_object_r2000(const uint8_t* data, size_t size,
                                                        uint32_t handle, size_t file_offset);

    // Entity common data
    nlohmann::json parse_entity_common(DwgBitReader& reader);

    // Entity data dispatch
    nlohmann::json parse_entity_data(DwgBitReader& reader, int type_num,
                                     const std::string& type_name, int obj_size);

    // Table object parsing
    nlohmann::json parse_table_object(DwgBitReader& reader, int type_num,
                                      const std::string& type_name, int obj_size);

    // EED skip
    void skip_eed(DwgBitReader& reader);

    // Geometric entity parsers
    nlohmann::json parse_line(DwgBitReader& reader);
    nlohmann::json parse_circle(DwgBitReader& reader);
    nlohmann::json parse_arc(DwgBitReader& reader);
    nlohmann::json parse_point_entity(DwgBitReader& reader);
    nlohmann::json parse_ellipse(DwgBitReader& reader);
    nlohmann::json parse_text_entity(DwgBitReader& reader);
    nlohmann::json parse_mtext(DwgBitReader& reader);
    nlohmann::json parse_insert(DwgBitReader& reader);
    nlohmann::json parse_lwpolyline(DwgBitReader& reader);
    nlohmann::json parse_spline(DwgBitReader& reader);
    nlohmann::json parse_solid(DwgBitReader& reader);
    nlohmann::json parse_ray(DwgBitReader& reader);
    nlohmann::json parse_xline(DwgBitReader& reader);

    // Table object parsers
    nlohmann::json parse_layer_object(DwgBitReader& reader);
    nlohmann::json parse_style_object(DwgBitReader& reader);
    nlohmann::json parse_ltype_object(DwgBitReader& reader);
    nlohmann::json parse_block_header_object(DwgBitReader& reader);
    nlohmann::json parse_dictionary_object(DwgBitReader& reader);
};

// ---------------------------------------------------------------------------
// Header sentinel constants
// ---------------------------------------------------------------------------

extern const uint8_t HEADER_SENTINEL_START[16];
extern const uint8_t HEADER_SENTINEL_END[16];
extern const uint8_t CLASSES_SENTINEL_START[16];
extern const uint8_t CLASSES_SENTINEL_END[16];

} // namespace ifcx

#endif // IFCX_DWG_PARSER_H
