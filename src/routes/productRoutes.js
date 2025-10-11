import express from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = express.Router();


router.get('/', async (req, res)=> {
    try {
        const produk = await prisma.produk.findMany();
        res.status(200).json(produk);
    } catch (error) {
        console.error({ error: error });
    } finally {
        prisma.$disconnect();
    }
});

router.get('/data/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const produk = await prisma.produk.findUnique({
            where: {
                id: Number(id)
            }
        });
        if (produk) {
            res.json(produk);
        } else {
            res.status(204).json({ message: "Produk tidak ditemukan" });
        }
    } catch (error) {
        console.error({ error });
    } finally {
        prisma.$disconnect();
    }
});

router.get('/toko/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const produk = await prisma.produk.findMany({
            where: { idToko: Number(id) },
            include: { user: true }
        });
        res.json(produk);
    } catch (error) {
        console.error({ error: error });
    } finally {
        prisma.$disconnect();
    }
});

router.get('/kategori/:kategori', async (req, res) => {
    const { kategori } = req.params;
    try {
        const produk = await prisma.produk.findMany({
            where: { kategori: kategori }
        });
        if (produk.length !== 0) {
            res.json(produk);
        } else {
            res.status(204).json({ message: "Belum ada produk dengan kategori ini :(" });
        }
    } catch (error) {
        console.error({ error: error });
    } finally {
        prisma.$disconnect();
    }
});

router.post('/add', async (req, res) => {
    const { nama, deskripsi, harga, jenisHarga, deskripsiHarga, idToko, kategori } = req.body;
    try {
       const produk = await prisma.produk.create({
        data: {
            nama: nama,
            deskripsi: deskripsi,
            harga: harga,
            jenisHarga: jenisHarga,
            deskripsiHarga: deskripsiHarga,
            idToko: idToko,
            kategori: kategori
        }
       });
       res.json({ message: `Anda mendaftarkan ${produk.nama} untuk dijual. Kami akan meninjau terlebih dahulu sebelum benar-benar menjual barang anda.` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server' });
    } finally {
        prisma.$disconnect();
    }
});

export default router;