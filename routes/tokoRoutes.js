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
        res.status(500).json({ error: 'Terjadi kesalahan pada server' });
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
        res.json(toko);
    } catch (error) {
        console.error({ error: error });
    } finally {
        prisma.$disconnect();
    }
});

router.post('/create', async (req, res) => {
    const { namaToko, deskripsi, idUser} = req.body;
    try {
        const checkToko = await prisma.toko.findUnique({
            where: { 
                idUser: idUser
            }
        });

        if (!checkToko) {
            await prisma.toko.create({
                data: {
                    namaToko: namaToko,
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

module.exports = router;