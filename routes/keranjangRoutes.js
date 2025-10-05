const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const daftarKeranjang = await prisma.keranjang.findMany({
            where: {
                idUser: Number(id),
            },
        });
        res.json(daftarKeranjang);
    } catch (error) {
        console.error({ error: error });
    } finally {
        prisma.$disconnect();
    }
});

router.post('/add', async (req, res) => {
    const data = req.body;
    
    try {
        await prisma.keranjang.create({
            data: data
        });
        res.status(201).json({ message: "data berhasil ditambahkan" });
    } catch (error) {
        console.error({ error: error });
    } finally {
        prisma.$disconnect();
    }
});

router.delete('/delete', async (req, res) => {
    try {
        await prisma.keranjang.deleteMany();
        res.json({ message: "Keranjang berhasil dikosongkan" });
    } catch (error) {
        console.error({ errpr: error });
    } finally {
        prisma.$disconnect();
    }
});

router.delete('/delete/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.keranjang.delete({
            where: {
                idProduk: Number(id)
            }
        });
        res.status(200).json({ message: "Keranjang berhasil dikosongkan" });
    } catch (error) {
        console.error({ errpr: error });
    } finally {
        prisma.$disconnect();
    }
});

module.exports = router;