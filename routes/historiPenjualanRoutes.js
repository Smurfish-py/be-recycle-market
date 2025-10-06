const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const user = await prisma.user.findUnique({
        where: {
            id: Number(id)
            }
        });

        if (!user) return res.status(404).json({ message:"Pengguna tidak ditemukan" });

        const produk = await prisma.penjualan.findMany({
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

router.patch('/update/user/:id/item/:itemId', async (req, res) => {
    const { id, itemId } = req.params;
    const data = req.body;
    try {
        const updateHistori = await prisma.penjualan.update({
            where: {
                idUser: Number(id),
                idProduk: Number(itemId)
            },
            data: data
        });

        if (!updateHistori) return res.status(400).json({ message: "Gagal mengubah histori" });

        res.status(201).json({ message: "Data berhasil diubah" });
    } catch (error) {
        console.error({ error: error });
    } finally {
        prisma.$disconnect();
    }
});

router.delete('/delete', async (req, res) => {
    try {
        const hasil = await prisma.penjualan.deleteMany();

        if (!hasil) return res.status(400).json({ message: "Gagal menghapus data" });

        res.status(201).json({ message: "Berhasil menghapus data" });
    } catch (error) {
        console.error(error);
    } finally {
        prisma.$disconnect();
    }
});

router.delete('/delete/user/:id/item/:itemId', async (req, res) => {
    const { id, itemId } = req.params;
    try {
        const checkPenjualan = await prisma.penjualan.findMany({
            where: {
                idUser: Number(id),
                idProduk: Number(itemId)
            }
        });

        if (!checkPenjualan) {
            return res.status(404).json({ message: "History tidak ditemukan" });
        } else {
            const hapusHistori = prisma.penjualan.deleteMany({
                where: {
                    idUser: Number(id),
                    idProduk: Number(itemId)
                }
            });

            if (!hapusHistori) return res.status(400).json({ message: "Gagal menghapus histori" });

            res.status(201).json({ message: "Histori berhasil dihapus" });
        }
    } catch (error) {
        console.error(error);
    } finally {
        prisma.$disconnect();
    }
});

module.exports = router;