
const jwt = require('jsonwebtoken');
const { dbGet } = require('../middlewares_helpers/sqlite3_helpers');

// =========================================
// MIDDLEWARE AUTENTIKASI JWT
// =========================================

const authenticateToken = async (req, res, next) => {
  const authHeader = req.get('Authorization');

  // 1. Periksa keberadaan token
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Token autentikasi tidak ditemukan. Silakan login.',
    });
  }

  const token = authHeader.slice(7).trim();

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Token autentikasi kosong.',
    });
  }

  // 2. Periksa konfigurasi JWT
  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET belum dikonfigurasi.');

    return res.status(500).json({
      success: false,
      message: 'Konfigurasi autentikasi belum tersedia.',
    });
  }

  // 3. Verifikasi token JWT
  let decoded;

  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({
      success: false,
      message:
        error.name === 'TokenExpiredError'
          ? 'Token sudah kedaluwarsa. Silakan login kembali.'
          : 'Token tidak valid. Silakan login kembali.',
    });
  }

  // 4. Periksa identitas pengguna di database
  try {
    const userId = Number(decoded.sub);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({
        success: false,
        message: 'Identitas pengguna dalam token tidak valid.',
      });
    }

    const user = await dbGet(
      `SELECT id, name, username, role, is_active
       FROM users
       WHERE id = ?`,
      [userId]
    );

    // 5. Pastikan akun masih tersedia
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Akun tidak ditemukan. Silakan login kembali.',
      });
    }

    // 6. Pastikan akun masih aktif
    if (user.is_active !== 1) {
      return res.status(403).json({
        success: false,
        message: 'Akun tidak aktif. Hubungi administrator.',
      });
    }

    // 7. Simpan identitas pengguna pada request
    req.user = {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
    };

    // 8. Lanjutkan ke controller
    return next();

  } catch (error) {
    console.error('[authenticateToken]', error);

    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat memverifikasi pengguna.',
    });
  }
};

// =========================================
// MIDDLEWARE PEMERIKSAAN ROLE
// =========================================

const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Silakan login terlebih dahulu.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Kamu tidak memiliki izin untuk mengakses fitur ini.',
      });
    }

    return next();
  };
};

module.exports = {
  authenticateToken,
  authorizeRoles,
};
