import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

router.get('/user/:id', async (req, res) => {
    const { id } = req.params;
    const parsedId = Number(id);

    if (isNaN(parsedId)) {
        return res.status(400).json({ msg: "ID User tidak valid" });
    }

    try {
        const response = await prisma.rating.findMany({
            where: { idUser: parsedId }
        });
        res.json(response);
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: "Terjadi kesalahan" });
    }
});

router.post('/:idProduct/:idUser', async (req, res) => {
    const { idProduct, idUser } = req.params;
    const { rating, komentar } = req.body;

    // 1. VALIDASI PARAMETER
    const parsedIdProduct = Number(idProduct);
    const parsedIdUser = Number(idUser);
    const parsedRating = Number(rating);

    // Cek apakah ada yang NaN (Not a Number)
    if (isNaN(parsedIdProduct) || isNaN(parsedIdUser)) {
        return res.status(400).json({ msg: "ID Produk atau ID User tidak valid. Pastikan Anda sudah login." });
    }

    if (isNaN(parsedRating)) {
        return res.status(400).json({ msg: "Rating harus berupa angka." });
    }

    try {
        // 2. CEK KETERSEDIAAN USER DAN PRODUK
        const user = await prisma.user.findUnique({
            where: { id: parsedIdUser }
        });

        const product = await prisma.produk.findUnique({
            where: { id: parsedIdProduct }
        });

        if (!user) return res.status(404).json({ msg: "User tidak ditemukan" });
        if (!product) return res.status(404).json({ msg: "Produk tidak ditemukan" });

        // 3. SIMPAN RATING
        const tambahRating = await prisma.rating.create({
            data: {
                idUser: parsedIdUser,
                idProduk: parsedIdProduct,
                rating: parsedRating,
                komentar: komentar || "" // Pastikan string kosong jika tidak ada komentar
            }
        });

        if (!tambahRating) return res.status(400).json({ msg: "Rating gagal ditambahkan" });
        
        return res.status(200).json({ msg: "Rating berhasil ditambahkan!" });
        
    } catch (error) {
        console.error("Error saat menambah rating:", error);
        return res.status(500).json({ msg: "Terjadi kesalahan internal server", error: error.message });
    }
});

router.delete("/delete/:id", async (req, res) => {
    const { id } = req.params;
    const parsedId = Number(id);

    if (isNaN(parsedId)) {
        return res.status(400).json({ msg: "ID tidak valid" });
    }

    try {
        const response = await prisma.rating.deleteMany({
            where: { idUser: parsedId }
        });

        if (!response) return res.status(400).json({ msg: "Terjadi kesalahan dalam menghapus ulasan" });

        res.json({ msg: "Berhasil menghapus ulasan!" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: "Terjadi kesalahan dalam menghapus ulasan" });
    }
});

export default router;