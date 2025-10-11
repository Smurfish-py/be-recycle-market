import express from 'express';
import { PrismaClient } from '@prisma/client';

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

router.patch("/update/user/:id/item/:itemId", async (req, res) => {
    const { id, itemId } = req.params;
    const data = req.data;
    try {
        const checkUser = await prisma.user.findUnique({
            where: {
                id: Number(id)
            }
        });

        if (!checkUser) {
            return res.status(404).json({ message: "User tidak ditemukan" })
        } else {
            const hasil = await prisma.transaksi.update({ 
                where: {
                    idUser: id,
                    idProduk: itemId
                },
                data: data
            });
            if (!hasil) return res.status(400).json({ message: "Gagal update user" });

            res.status(201).json({ message: "Data berhasil diubah" });
        }
    } catch (error) {
        console.error(error);
    } finally {
        prisma.$disconnect();
    }
});

router.delete('/delete', async (req, res) => {
    try {
        const hasil = await prisma.transaksi.deleteMany();

        if (!hasil) return res.status(400).json({ message: "Gagal menghapus history" });

        res.status(201).json({ message: "History berhasil dihapus" });
    } catch (error) {
        console.error(error);
    } finally {
        prisma.$disconnect();
    }
});

router.delete('/delete/user/:id/item/:itemId', async (req, res) => {
    const { id, itemId } = req.params;
    try {
        const checkTransaksi = await prisma.transaksi.findMany({
            where: {
                idUser: Number(id),
                idProduk: Number(itemId)
            }
        });

        if (!checkTransaksi) {
            return res.status(404).json({ message: "History tidak ditemukan" });
        } else {
            const hapusHistori = prisma.transaksi.deleteMany({
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

export default router;