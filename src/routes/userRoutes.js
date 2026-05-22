import express from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const router = express.Router();
const prisma = new PrismaClient();
const { JWT_SECRET, TOKEN_DURATION } = process.env;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, '..', 'uploads', 'user', 'pfp');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        try {
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
            cb(null, uploadDir);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});
const uploadImage = multer({ storage });

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await prisma.user.findUnique({
            where: {
                email
            },
            include: {
                privilege: {
                    select: {
                        privilege: true
                    }
                },
                toko: {
                    select: {
                        id: true
                    }
                }
            }
        });

        if (user) {
            await prisma.user.update({
                where: {
                    email
                },
                data: {
                    lastOnline: new Date()
                }
            });
        }

        if (!user) return res.status(404).json({ pesan: `Tidak ada user dengan email ${email}` });

        const valid = await bcrypt.compare(password, user.password);

        if (!valid) return res.status(401).json({ pesan: 'Password anda salah!' });

        const token = jwt.sign({
            id: user.id,
            email,
            password,
            privilege: user.privilege[0]?.privilege || null,
            idToko: user.toko?.[0]?.id || null
        },
        JWT_SECRET,
        { expiresIn: TOKEN_DURATION });

        return res.json({ token });
    } catch (error) {
        return res.status(500).json({ status: false, pesan: error.message });
    }
});

router.post('/register', async (req, res) => {
    const { fullname, email, password } = req.body;

    try {
        const user = await prisma.user.findUnique({
            where: {
                email
            }
        });
        
        if (user) return res.status(409).json({ status: false, pesan: `Email ${email} sudah terdaftar, gunakan email lain` });

        const hashed = await bcrypt.hash(password, 10);
        
        const generatedRecoveryCode = crypto.randomBytes(6).toString('hex').toUpperCase();

        const addUser = await prisma.user.create({
            data: {
                fullname,
                username: fullname,
                password: hashed,
                email,
                recoveryCode: generatedRecoveryCode, 
                privilege: {
                    create: {
                        privilege: 'DEFAULT'
                    }
                }
            }
        });

        if (!addUser) return res.status(400).json({ status: false, pesan: "Gagal mendaftarkan" });

        return res.status(201).json({ 
            status: true, 
            pesan: "Pendaftaran berhasil!", 
            recoveryCode: generatedRecoveryCode 
        });

    } catch (error) {
        return res.status(500).json({ status: false, pesan: error.message });
    }
});

router.get('/', async (req, res) => {
    try {
        const user = await prisma.user.findMany({
            include: {
                privilege: {
                    select: {
                        privilege: true
                    }
                }
            }
        });
        res.status(200).json(user);
    } catch (error) {
        return res.status(500).json({ status: false, pesan: error.message });
    }
});

router.get('/data/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const user = await prisma.user.findUnique({
            where: { id: Number(id) },
            include: {
                privilege: {
                    select: {
                        privilege: true
                    }
                }
            }
        });

        if (!user) {
            return res.status(404).json({ message: 'User tidak ditemukan :(' });
        }
        res.json(user);
    } catch (error) {
        return res.status(500).json({ status: false, pesan: error.message });
    }
});

router.get('/privilege/:privilege', async (req, res) => {
    const { privilege } = req.params;
    try {
        const user = await prisma.privilege.findMany({
            where: {
                privilege
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        fullname: true,
                        profilePfp: true
                    }
                },
            }
        });

        res.json(user);
    } catch (error) {
        return res.status(500).json({ status: false, pesan: error.message });
    }
});

router.get('/count', async (req, res) => {
    try {
        const [ users, admins, partners, defaultUsers ] = await prisma.$transaction([
            prisma.user.count(),
            prisma.user.count({
                where: {
                    privilege: { some: { privilege: "ADMIN" }}
                }
            }),
            prisma.user.count({
                where: {
                    privilege: { some: { privilege: "PARTNER" }}
                }
            }),
            prisma.user.count({
                where: {
                    privilege: { some: { privilege: "DEFAULT" }}
                }
            }),
        ]);

        res.json({
            users,
            admins,
            partners,
            defaultUsers
        });
    } catch (error) {
        return res.status(500).json({ status: false, pesan: error.message });
    }
});

router.post('/create', async (req, res) => {
    const { fullname, username, email, password } = req.body;
    try {
        const userCheck = await prisma.user.findUnique({
            where: {
                email: email
            }
        });

        if (!userCheck) {
            const hashed = await bcrypt.hash(password, 10);
            const generatedRecoveryCode = crypto.randomBytes(6).toString('hex').toUpperCase();

            const userBaru = await prisma.user.create({
                data: {
                    fullname: fullname,
                    username: username,
                    email: email,
                    password: hashed,
                    recoveryCode: generatedRecoveryCode
                }
            });

            res.json({ message: `Berhasil ditambahkan! Selamat datang ${userBaru.fullname}` });
        } else {
            return res.json({ message: "User sudah terdaftar!" });
        }
    } catch (error) {
        return res.status(500).json({ status: false, pesan: error.message });
    }
});

router.patch('/update/:id', uploadImage.single('profilePfp'), async (req, res) => {
    const { id } = req.params;
    try {
        const user = await prisma.user.findUnique({
            where: {id: Number(id)}
        });

        if (user) {
            const { profilePfp } = user;
            const photoPath = uploadDir.concat(`/${profilePfp}`);

            await prisma.user.update({
                where: { 
                    id: Number(id) 
                },
                data: {
                    ...req.body,
                    profilePfp: req?.file?.filename
                },
            });

            if (req?.file && profilePfp && fs.existsSync(photoPath)) {
                fs.unlink(photoPath, (error) => {
                    if (error) {
                        console.log('Gagal menghapus file lama: ', error);
                        return;
                    };
                });
            }

            res.json({ message: "Data berhasil diubah!" });
        } else {
            res.status(404).json({ message: "User tidak ditemukan" });
        }
    } catch (error) {
        return res.status(500).json({ status: false, pesan: error.message });
    }
});

router.delete('/delete/:id', async (req, res) => {
    const { id } = req.params;
    const userId = Number(id);
    
    try {
        const userCheck = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!userCheck) {
            return res.status(404).json({ message: "Gagal menghapus user, user tidak ditemukan!" });
        }

        // Gunakan $transaction untuk memastikan semua relasi terhapus bersamaan dengan aman
        await prisma.$transaction([
            // 1. Hapus privilege hak akses user
            prisma.privilege.deleteMany({ where: { idUser: userId } }),
            
            // 2. Hapus produk yang disimpan di Wishlist/Markah oleh user ini
            prisma.markah.deleteMany({ where: { idUser: userId } }),
            
            // 3. Hapus ulasan/rating yang pernah ditulis oleh user ini
            prisma.rating.deleteMany({ where: { idUser: userId } }),
            
            // 4. Hapus permintaan pembukaan toko atau verifikasi produk dari user ini
            prisma.permintaan.deleteMany({ where: { idUser: userId } }),

            // 5. Hapus Toko jika user tersebut merupakan owner/partner toko
            prisma.toko.deleteMany({ where: { idUser: userId } }),

            // 6. Terakhir, hapus data inti User setelah semua foreign key bersih
            prisma.user.delete({
                where: { id: userId }
            })
        ]);

        return res.send({ message: "Sedih rasanya melihat anda pergi, Senang mengenal Anda!" });
        
    } catch (error) {
        return res.status(500).json({ status: false, pesan: error.message });
    }
});

router.post('/verify-recovery', async (req, res) => {
    const { email, recoveryCode } = req.body;

    try {
        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            return res.status(404).json({ status: false, pesan: "Email tidak terdaftar" });
        }

        if (!user.recoveryCode || user.recoveryCode !== recoveryCode) {
            return res.status(400).json({ status: false, pesan: "Kode pemulihan salah atau tidak valid" });
        }

        // Jika berhasil cocok, kirimkan userId ke frontend untuk keamanan langkah reset berikutnya
        return res.status(200).json({ status: true, userId: user.id, pesan: "Kode cocok" });

    } catch (error) {
        return res.status(500).json({ status: false, pesan: error.message });
    }
});

// Endpoint 2: Mengeksekusi Update Password Baru setelah terverifikasi
router.post('/reset-password', async (req, res) => {
    const { id, password } = req.body;

    try {
        const hashed = await bcrypt.hash(password, 10);

        // Generate ulang kode pemulihan baru agar kode lama tidak bisa digunakan kembali demi keamanan
        const newRecoveryCode = crypto.randomBytes(6).toString('hex').toUpperCase();

        await prisma.user.update({
            where: { id: Number(id) },
            data: {
                password: hashed,
                recoveryCode: newRecoveryCode // Ganti kode lama demi keamanan sekali pakai
            }
        });

        return res.status(200).json({ status: true, pesan: "Password berhasil diperbarui" });

    } catch (error) {
        return res.status(500).json({ status: false, pesan: error.message });
    }
});

export default router;