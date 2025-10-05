const express = require('express');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const toko = await prisma.toko.findMany();
        res.json(toko);
    } catch (error) {
        console.error(error);
    } finally {
        prisma.$disconnect();
    }
}); 

router.get('/data/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const toko = await prisma.toko.findUnique({
            where: {
                id: Number(id)
            }
        });

        if (!toko) {
            return res.status(404).send({ message: "Toko tidak ditemukan" });
        }
        res.json(toko);
    } catch (error) {
        console.error({ error: error });
    } finally {
        prisma.$disconnect();
    }
});

router.post('/create', async (req, res) => {
    const { nama, deskripsi, idUser} = req.body;
    try {
        const checkToko = await prisma.toko.findUnique({
            where: { 
                idUser: idUser
            }
        });

        if (!checkToko) {
            await prisma.toko.create({
                data: {
                    nama: nama,
                    deskripsi: deskripsi,
                    idUser: idUser
                }
            });
        res.json({ message: "Toko telah berhasil di daftarkan!" });
        } else {
            return res.status(400).json({ message: 'Toko sudah terdaftar' });
        }
    } catch (error) {
        console.error({ error: error });
    } finally {
        prisma.$disconnect();
    }
});

router.patch('/update/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const checkToko = await prisma.toko.findUnique({
            where: { id: Number(id) }
        });

        if (checkToko) {
            await prisma.toko.update({
                where: { id: Number(id) },
                data: req.body
            });
            res.status(201).json({ message: "Perubahan disimpan!" });
        } else {
            res.status(404).json({ message: "Toko tidak ditemukan!" });
        }
    } catch (error) {
        console.error({ error: error });
    } finally {
        prisma.$disconnect();
    }
});

router.delete('/delete/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const checkToko = await prisma.toko.findUnique({
            where: { id: Number(id) }
        });

        if (checkToko) {
            await prisma.toko.delete({
                where: { id: Number(id) }
            });
            res.json({ message: "Toko berhasil dihapus" });
        } else {
            res.status(404).json({ message: "Toko tidak ditemukan" });
        }
    } catch (error) {
        console.error({ error: error });
    } finally {
        prisma.$disconnect();
    }
});

module.exports = router;