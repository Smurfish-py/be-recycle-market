import express from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

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
        throw error;
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
        
        const addUser = await prisma.user.create({
            data: {
                fullname,
                username: fullname,
                password: hashed,
                email,
                privilege: {
                    create: {
                        privilege: 'DEFAULT'
                    }
                }
            }
        });

        if (!addUser) return res.json({ status: true, pesan: "Gagal mendaftarkan" });

        return res.status(201).json({ status: true, pesan: "Pendaftaran berhasil, silakan login!" });

    } catch (error) {
        throw error;
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
        throw error;
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
        throw error;
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
        throw error;
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
        throw error;
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
            const userBaru = await prisma.user.create({
                data: {
                    fullname: fullname,
                    username: username,
                    email: email,
                    password: password
                }
            });

            res.json({ message: `Berhasil ditambahkan! Selamat datang ${userBaru.fullname}` });
        } else {
            return res.json({ message: "User sudah terdaftar!" });
        }
    } catch (error) {
        console.error({ error: error });
    }
});

router.patch('/update/:id', uploadImage.single('profilePfp'), async (req, res) => {
    const { id } = req.params;
    try {
        const user = await prisma.user.findUnique({
            where: {id: Number(id)}
        });

        const { profilePfp } = user;
        const photoPath = uploadDir.concat(`/${profilePfp}`);
        console.log(photoPath);

        if (user) {
            await prisma.user.update({
                where: { 
                    id: Number(id) 
                },
                data: {
                    ...req.body,
                    profilePfp: req?.file?.filename
                },
            });

            if (fs.existsSync(photoPath)) {
                fs.unlink(photoPath, (error) => {
                    if (error) {
                        console.log('Gagal menghapus file: ', error);
                        return;
                    };
                });
            };

            res.json({ message: "Data berhasil diubah!" });
        } else {
            res.status(404).json({ message: "User tidak ditemukan" });
        }
    } catch (error) {
        console.error({ error: error});
    }
});

router.delete('/delete/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        const userCheck = prisma.user.findUnique({
            where: {id: Number(id)}
        });

        if (userCheck) {
            await prisma.user.delete({
                where: {id: Number(id)}
            });
            res.send({ message: "Sedih rasanya melihat anda pergi, Senang mengenal Anda!" });
        } else {
            res.status(404).json({ message: "Gagal menghapus user, user tidak ditemukan!" });
        }
    } catch (error) {
        console.error({ error: error });
    }
});

export default router;