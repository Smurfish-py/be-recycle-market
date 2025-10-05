const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { route } = require('./keranjangRoutes');

const router = express.Router();
const prisma = new PrismaClient();

router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const user = prisma.user.findUnique({
        where: {
            id: Number(id)
            }
        });

        if (!user) return res.status(404).json({ message:"Pengguna tidak ditemukan" });

        const produk = prisma.penjualan.findMany({
            where: {
                idUser: Number(id)
            }
        });

        res.json(produk);
    } catch (error) {
        console.error({ error:error });
    } finally {
        prisma.$disconnect();
    }
});

router.post('/add', async (req, res) => {
    try {
        const data = req.body;

        const tambahHistori = await prisma.penjualan.create({
            data: data
        });

        if (!tambahHistori) return res.status(400).json({ message:"Gagal menambah histori" });

        res.status(201).json({ message: "Histori berhasil ditambahkan" });
    } catch (error) {
        console.error({ error: error });
    } finally {
        prisma.$disconnect();
    }
});

router.patch('/update/:id', async (req, res) => {
    const { id } = req.params;
    try {
        
    } catch (error) {
        console.error({ error: error });
    } finally {
        prisma.$disconnect();
    }
});

module.exports = router;