
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');

// =========================================
// POST /api/auth/login
// LOGIN ADMIN DAN KASIR
// =========================================

const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // 1. Validasi input
    if (
      typeof username !== 'string' ||
      typeof password !== 'string' ||
      username.trim() === '' ||
      password === ''
    ) {
      return res.status(400).json({
        success: false,
        message: 'Username dan password wajib diisi.',
      });
    }

    // 2. Cari akun berdasarkan username
    const user = await userModel.findUserByUsername(username.trim());

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Username atau password salah.',
      });
    }

    // 3. Periksa status akun
    if (user.is_active !== 1) {
      return res.status(403).json({
        success: false,
        message: 'Akun tidak aktif. Hubungi administrator.',
      });
    }

    // 4. Periksa password menggunakan bcrypt
    const passwordMatch = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Username atau password salah.',
      });
    }

    // 5. Periksa JWT_SECRET
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      console.error('JWT_SECRET belum dikonfigurasi.');

      return res.status(500).json({
        success: false,
        message: 'Konfigurasi autentikasi belum tersedia.',
      });
    }

    // 6. Buat token JWT
    const token = jwt.sign(
      { role: user.role },
      jwtSecret,
      {
        subject: String(user.id),
        expiresIn: '8h',
      }
    );

    // 7. Kirim respons login
    return res.status(200).json({
      success: true,
      message: 'Login berhasil.',
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          role: user.role,
        },
      },
    });

  } catch (error) {
    console.error('[login]', error);

    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server.',
    });
  }
};

module.exports = {
  login,
};
