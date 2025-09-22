const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
    try {
        const user = await prisma.user.findMany();
        res.json(user);
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
});

router.get('/:id', async (req, res) => {
    const id = req.params;
    try {
        const user = await prisma.user.findUnique({
            where: { id: Number(id) },
        });

        if (!user) {
            return res.status(404).json({ message: 'User tidak ditemukan :(' });
        }
        res.send(user);
    } catch (err) {
        res.status(500).error({ error: err.message });
    } finally {
        await prisma.$disconnect();
    }
});

router.post('/', async (req, res) => {
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
    } catch (err) {
        console.error({ error: err.message });
    } finally {
        await prisma.$disconnect()
    }
});

router.patch('/:id', async (req, res) => {
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
        console.error({ error: error.message });
    } finally {
        prisma.$disconnect();
    }
});

router.delete('/:id', async (req, res) => {
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
        console.error({ error: error.message });
    } finally {
        prisma.$disconnect();
    }
});

module.exports = router;