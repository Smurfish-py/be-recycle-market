import express from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const router = express.Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;

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
        { expiresIn: '1h' });

        return res.json({ token      });
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
                        privilege: 'default'
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
        const user = await prisma.user.findMany();
        res.status(200).json(user);
    } catch (error) {
        console.error(error);
    } finally {
        await prisma.$disconnect();
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
    } finally {
        await prisma.$disconnect();
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
    } finally {
        await prisma.$disconnect()
    }
});

router.patch('/update/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const userCheck = await prisma.user.findUnique({
            where: {id: Number(id)}
        });

        if (userCheck) {
            await prisma.user.update({
                where: { id: Number(id) },
                data: req.body,
            });
            res.json({ message: "Data berhasil diubah!" });
        } else {
            res.status(404).json({ message: "User tidak ditemukan" });
        }
    } catch (error) {
        console.error({ error: error});
    } finally {
        prisma.$disconnect();
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
    } finally {
        prisma.$disconnect();
    }
});

export default router;