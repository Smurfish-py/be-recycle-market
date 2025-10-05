const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

router.get('/:id', async (req, res) => {
    const userId = req.params.id;

    try {
        const history = prisma.transaksi.findMany({
            where: { idUser: userId }
        });    
        res.status(200).json(history);
    } catch (error) {
        console.error({ error: error });
    } finally {
        prisma.$disconnect();
    }
});

router.post('/add', async (req, res) => {
    try {
        const tambahData = await prisma.transaksi.create({
            data: req.body,
        });

        if (!tambahData) return res.status(400).json({ message:"Gagal menambahkan histori" });

        res.status(201).json({ message: "data berhasil ditambahkan" });
    } catch (error) {
        console.error({ error: error });
    } finally {
        prisma.$disconnect();
    }
});

module.exports = router;