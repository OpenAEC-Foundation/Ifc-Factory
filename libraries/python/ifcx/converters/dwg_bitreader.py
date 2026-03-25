"""Bit-level reader for DWG binary format.

Reads individual bits and DWG-specific compressed data types from a byte
buffer. Built from scratch using only the Python standard library.

References:
    - Open Design Alliance DWG File Format Specification
    - LibreDWG documentation and bit-level encoding notes
"""

from __future__ import annotations

import struct


class DwgBitReader:
    """Reads individual bits and DWG-specific data types from a byte buffer.

    DWG files use bit-level packing. Bits are numbered MSB-first within each
    byte (bit 7 of byte 0 is the first bit in the stream).
    """

    def __init__(self, data: bytes, offset: int = 0) -> None:
        self.data = data
        self.bit_position = offset * 8  # position in bits

    # ------------------------------------------------------------------
    # Low-level bit reading
    # ------------------------------------------------------------------

    def read_bit(self) -> int:
        """Read a single bit (B)."""
        byte_idx = self.bit_position >> 3
        bit_idx = 7 - (self.bit_position & 7)
        if byte_idx >= len(self.data):
            raise EOFError("DwgBitReader: read past end of data")
        val = (self.data[byte_idx] >> bit_idx) & 1
        self.bit_position += 1
        return val

    def read_bits(self, count: int) -> int:
        """Read *count* bits and return them as an unsigned integer (MSB first)."""
        result = 0
        for _ in range(count):
            result = (result << 1) | self.read_bit()
        return result

    # ------------------------------------------------------------------
    # Raw fixed-size types (byte-aligned reads use struct)
    # ------------------------------------------------------------------

    def read_byte(self) -> int:
        """Read an unsigned byte (RC) -- 8 bits, *not* byte-aligned."""
        return self.read_bits(8)

    def read_raw_char(self) -> int:
        """Alias for :meth:`read_byte`."""
        return self.read_byte()

    def read_short(self) -> int:
        """Read a signed 16-bit little-endian short (RS) from the bit stream."""
        lo = self.read_bits(8)
        hi = self.read_bits(8)
        val = lo | (hi << 8)
        if val >= 0x8000:
            val -= 0x10000
        return val

    def read_raw_short(self) -> int:
        """Read an unsigned 16-bit LE short (RS) from the bit stream."""
        lo = self.read_bits(8)
        hi = self.read_bits(8)
        return lo | (hi << 8)

    def read_long(self) -> int:
        """Read a signed 32-bit LE long (RL) from the bit stream."""
        b0 = self.read_bits(8)
        b1 = self.read_bits(8)
        b2 = self.read_bits(8)
        b3 = self.read_bits(8)
        val = b0 | (b1 << 8) | (b2 << 16) | (b3 << 24)
        if val >= 0x80000000:
            val -= 0x100000000
        return val

    def read_raw_long(self) -> int:
        """Read an unsigned 32-bit LE long (RL)."""
        b0 = self.read_bits(8)
        b1 = self.read_bits(8)
        b2 = self.read_bits(8)
        b3 = self.read_bits(8)
        return b0 | (b1 << 8) | (b2 << 16) | (b3 << 24)

    def read_double(self) -> float:
        """Read a 64-bit IEEE double (RD) from the bit stream."""
        raw = bytes(self.read_bits(8) for _ in range(8))
        return struct.unpack("<d", raw)[0]

    # ------------------------------------------------------------------
    # DWG compressed types
    # ------------------------------------------------------------------

    def read_BB(self) -> int:
        """Read a 2-bit value."""
        return self.read_bits(2)

    def read_BS(self) -> int:
        """Bit Short -- 2-bit prefix + variable payload.

        00 -> raw 16-bit signed short
        01 -> raw 8-bit unsigned
        10 -> value is 0
        11 -> value is 256
        """
        prefix = self.read_bits(2)
        if prefix == 0:
            return self.read_short()
        elif prefix == 1:
            return self.read_byte()
        elif prefix == 2:
            return 0
        else:
            return 256

    def read_BL(self) -> int:
        """Bit Long -- 2-bit prefix + variable payload.

        00 -> raw 32-bit signed long
        01 -> raw 8-bit unsigned
        10 -> value is 0
        11 -> raw 32-bit long (used in some versions)
        """
        prefix = self.read_bits(2)
        if prefix == 0:
            return self.read_long()
        elif prefix == 1:
            return self.read_byte()
        elif prefix == 2:
            return 0
        else:
            return self.read_long()

    def read_BD(self) -> float:
        """Bit Double -- 2-bit prefix + variable payload.

        00 -> raw 64-bit IEEE double
        01 -> value is 1.0
        10 -> value is 0.0
        """
        prefix = self.read_bits(2)
        if prefix == 0:
            return self.read_double()
        elif prefix == 1:
            return 1.0
        else:
            return 0.0

    def read_DD(self, default: float) -> float:
        """Default Double -- 2-bit prefix + variable payload.

        00 -> value == default
        01 -> read 4 bytes, replace low 4 bytes of default's IEEE-754 LE repr
        10 -> read 6 bytes, replace bytes [4,5,0,1,2,3] of default (LE)
        11 -> read full 8-byte double
        """
        prefix = self.read_bits(2)
        if prefix == 0:
            return default
        if prefix == 3:
            return self.read_double()

        # We need to manipulate the raw bytes of the default value
        raw = bytearray(struct.pack("<d", default))
        if prefix == 1:
            # Replace bytes 0-3 (low 4 bytes of LE double)
            raw[0] = self.read_byte()
            raw[1] = self.read_byte()
            raw[2] = self.read_byte()
            raw[3] = self.read_byte()
        elif prefix == 2:
            # Replace bytes 4,5 then 0,1,2,3
            raw[4] = self.read_byte()
            raw[5] = self.read_byte()
            raw[0] = self.read_byte()
            raw[1] = self.read_byte()
            raw[2] = self.read_byte()
            raw[3] = self.read_byte()
        return struct.unpack("<d", bytes(raw))[0]

    def read_BT(self) -> float:
        """Bit Thickness -- for R2000+.

        If leading bit is 1, value is 0.0. Otherwise read BD.
        """
        if self.read_bit():
            return 0.0
        return self.read_BD()

    def read_BE(self) -> tuple[float, float, float]:
        """Bit Extrusion -- for R2000+.

        If leading bit is 1, value is (0, 0, 1). Otherwise read 3 BD values.
        """
        if self.read_bit():
            return (0.0, 0.0, 1.0)
        x = self.read_BD()
        y = self.read_BD()
        z = self.read_BD()
        # normalize
        if x == 0.0 and y == 0.0:
            z = -1.0 if z <= 0.0 else 1.0
        return (x, y, z)

    # ------------------------------------------------------------------
    # Handle references
    # ------------------------------------------------------------------

    def read_H(self) -> tuple[int, int]:
        """Handle reference.

        Layout: 4-bit code | 4-bit counter (number of handle bytes)
        Then *counter* bytes of handle value (big-endian).

        Returns ``(code, handle_value)``.
        """
        code = self.read_bits(4)
        counter = self.read_bits(4)
        handle = 0
        for _ in range(counter):
            handle = (handle << 8) | self.read_byte()
        return (code, handle)

    # ------------------------------------------------------------------
    # Text strings
    # ------------------------------------------------------------------

    def read_T(self, is_unicode: bool = False) -> str:
        """Text string.

        For R2000-R2004: BS length + *length* raw bytes (code-page encoded).
        For R2007+: BS length + *length* * 2 bytes (UTF-16LE).

        Parameters
        ----------
        is_unicode:
            If ``True``, read UTF-16LE characters (R2007+).
        """
        length = self.read_BS()
        if length <= 0:
            return ""
        if is_unicode:
            raw = bytes(self.read_byte() for _ in range(length * 2))
            return raw.decode("utf-16-le", errors="replace").rstrip("\x00")
        else:
            raw = bytes(self.read_byte() for _ in range(length))
            return raw.decode("latin-1", errors="replace").rstrip("\x00")

    # ------------------------------------------------------------------
    # Point helpers
    # ------------------------------------------------------------------

    def read_2RD(self) -> tuple[float, float]:
        """Two raw doubles (2D point)."""
        return (self.read_double(), self.read_double())

    def read_3RD(self) -> tuple[float, float, float]:
        """Three raw doubles (3D point)."""
        return (self.read_double(), self.read_double(), self.read_double())

    def read_2BD(self) -> tuple[float, float]:
        """Two bit doubles (2D point, compressed)."""
        return (self.read_BD(), self.read_BD())

    def read_3BD(self) -> tuple[float, float, float]:
        """Three bit doubles (3D point, compressed)."""
        return (self.read_BD(), self.read_BD(), self.read_BD())

    # ------------------------------------------------------------------
    # Color
    # ------------------------------------------------------------------

    def read_CMC(self) -> int:
        """Read a color value (CMC) -- for R2000 this is just a BS index."""
        return self.read_BS()

    # ------------------------------------------------------------------
    # Modular char / modular short (used in object map & object sizes)
    # ------------------------------------------------------------------

    @staticmethod
    def read_modular_char(data: bytes, pos: int) -> tuple[int, int]:
        """Read a *modular char* (MC) from raw bytes at *pos*.

        Each byte contributes 7 data bits; bit 7 is the continuation flag.
        The last byte's bit 6 is the sign bit.

        Returns ``(value, new_pos)``.
        """
        result = 0
        shift = 0
        negative = False
        while True:
            if pos >= len(data):
                raise EOFError("modular_char: unexpected end of data")
            b = data[pos]
            pos += 1
            cont = b & 0x80
            result |= (b & 0x7F) << shift
            shift += 7
            if not cont:
                # last byte -- bit 6 is sign
                if b & 0x40:
                    negative = True
                    # mask out the sign bit from value
                    result &= ~(0x40 << (shift - 7))
                break
        if negative:
            result = -result
        return (result, pos)

    @staticmethod
    def read_modular_short(data: bytes, pos: int) -> tuple[int, int]:
        """Read a *modular short* (MS) from raw bytes at *pos*.

        Each 2-byte word contributes 15 data bits; bit 15 (high bit of
        second byte) is the continuation flag.

        Returns ``(value, new_pos)``.
        """
        result = 0
        shift = 0
        while True:
            if pos + 1 >= len(data):
                raise EOFError("modular_short: unexpected end of data")
            lo = data[pos]
            hi = data[pos + 1]
            pos += 2
            word = lo | ((hi & 0x7F) << 8)
            result |= word << shift
            shift += 15
            if not (hi & 0x80):
                break
        return (result, pos)

    # ------------------------------------------------------------------
    # Positioning
    # ------------------------------------------------------------------

    def seek_byte(self, offset: int) -> None:
        """Set position to byte *offset* (bit position = offset * 8)."""
        self.bit_position = offset * 8

    def seek_bit(self, bit_offset: int) -> None:
        """Set position to absolute *bit_offset*."""
        self.bit_position = bit_offset

    def tell_byte(self) -> int:
        """Return current byte offset (truncated)."""
        return self.bit_position >> 3

    def tell_bit(self) -> int:
        """Return current bit position."""
        return self.bit_position

    def align_byte(self) -> None:
        """Advance to the next byte boundary if not already aligned."""
        rem = self.bit_position & 7
        if rem:
            self.bit_position += 8 - rem

    def remaining_bytes(self) -> int:
        """Approximate number of bytes remaining."""
        return max(0, len(self.data) - self.tell_byte())

    def read_raw_bytes(self, count: int) -> bytes:
        """Read *count* raw bytes from the bit stream (bit-level, not aligned)."""
        return bytes(self.read_byte() for _ in range(count))
