#ifndef IFCX_DGN_PARSER_H
#define IFCX_DGN_PARSER_H

#include <cmath>
#include <cstdint>
#include <map>
#include <optional>
#include <string>
#include <tuple>
#include <vector>

#include <nlohmann/json.hpp>

namespace ifcx {

// ---------------------------------------------------------------------------
// DGN data model
// ---------------------------------------------------------------------------

/// Represents a single DGN element.
struct DgnElement {
    int type = 0;
    std::string type_name;
    int level = 0;
    bool deleted = false;
    bool complex = false;
    size_t offset = 0;     // byte offset in file
    size_t size = 0;       // size in bytes (header + data)
    int graphic_group = 0;
    int properties = 0;
    int color = 0;
    int weight = 0;
    int style = 0;
    nlohmann::json data;
};

/// Represents a parsed DGN V7 file.
struct DgnFile {
    std::string version = "V7";
    std::vector<DgnElement> elements;
    bool is_3d = false;
    int uor_per_sub = 1;
    int sub_per_master = 1;
    std::string master_unit_name;
    std::string sub_unit_name;
    std::tuple<double, double, double> global_origin = {0.0, 0.0, 0.0};
    std::vector<std::tuple<uint8_t, uint8_t, uint8_t>> color_table;
};

// ---------------------------------------------------------------------------
// DGN element type constants
// ---------------------------------------------------------------------------

extern const std::map<int, std::string> DGN_ELEMENT_TYPES;

// ---------------------------------------------------------------------------
// DgnParser -- parses DGN V7 binary files
// ---------------------------------------------------------------------------

class DgnParser {
public:
    DgnParser();

    /// Parse a DGN V7 file from raw bytes.
    DgnFile parse(const uint8_t* data, size_t size);
    DgnFile parse(const std::vector<uint8_t>& data);

private:
    int dimension_ = 2;
    double scale_ = 1.0;
    double origin_x_ = 0.0;
    double origin_y_ = 0.0;
    double origin_z_ = 0.0;
    bool got_tcb_ = false;

    // Element types that do NOT have a display header
    static bool has_no_display_header(int etype);

    // Low-level binary helpers
    static uint16_t read_uint16_le(const uint8_t* data, size_t offset);
    static uint32_t read_int32_me(const uint8_t* data, size_t offset);
    static int32_t read_int32_me_signed(const uint8_t* data, size_t offset);
    static double vax_to_ieee(const uint8_t* data, size_t offset);

    // Element reading
    std::optional<DgnElement> read_element(const uint8_t* data, size_t data_size,
                                           size_t offset, DgnFile& dgn);

    // TCB parsing
    void parse_tcb(const uint8_t* raw, size_t raw_size, DgnFile& dgn);

    // Color table parsing
    void parse_color_table(const uint8_t* raw, size_t raw_size, DgnFile& dgn);

    // Coordinate transform
    std::tuple<double, double, double> transform_point(double x, double y, double z = 0.0);
    std::tuple<double, double, double> read_point_int(const uint8_t* raw, size_t offset);

    // Element-specific parsers
    nlohmann::json parse_line(const uint8_t* raw, size_t raw_size);
    nlohmann::json parse_multipoint(const uint8_t* raw, size_t raw_size, int etype);
    nlohmann::json parse_ellipse_element(const uint8_t* raw, size_t raw_size);
    nlohmann::json parse_arc_element(const uint8_t* raw, size_t raw_size);
    nlohmann::json parse_text_element(const uint8_t* raw, size_t raw_size);
    nlohmann::json parse_text_node(const uint8_t* raw, size_t raw_size);
    nlohmann::json parse_cell_header(const uint8_t* raw, size_t raw_size);
    nlohmann::json parse_complex_header(const uint8_t* raw, size_t raw_size);
    nlohmann::json parse_tag_value(const uint8_t* raw, size_t raw_size);

    // Radix-50 decoding
    static std::string rad50_to_ascii(uint16_t value);
};

} // namespace ifcx

#endif // IFCX_DGN_PARSER_H
