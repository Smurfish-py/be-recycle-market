import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

router.get('/user/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const response = await prisma.rating.findMany({
            where: {
                idUser: Number(id)
            }
        })

        res.json(response);
    } catch (error) {
        console.log(error);
        res.status(500).json({msg: "Terjadi kesalahan"})
    }
});

router.post('/:idProduct/:idUser', async (req, res) => {
    const { idProduct, idUser } = req.params;
    const { rating, komentar } = req.body;

    try {
        const user = await prisma.user.findUnique({
            where: { id: Number(idUser) }
        });

        const product = await prisma.produk.findUnique({
            where: { id: Number(idProduct) }
        });

        if (user && product) {
            const tambahRating = await prisma.rating.create({
                data: {
                    idUser: Number(idUser),
                    idProduk: Number(idProduct),
                    rating: Number(rating),
                    komentar
                }
            });

            if (!tambahRating) return res.json({msg: "rating gagal ditambahkan"});
            
            res.json({msg: "Rating berhasil ditambahkan!"});
        }
        
    } catch (error) {
        console.error("Error saat menambah rating:", error);
        return res.status(500).json({ msg: "Terjadi kesalahan internal server", error: error.message });
    }
});

router.delete("/delete/:id", async (req, res) => {
    const { id } = req.params;

    try {
        const response = await prisma.rating.deleteMany({
            where: {
                idUser: Number(id)
            }
        })

        if (!response) return res.status(500).json({msg: "Terjadi kesalahan dalam menghapus ulasan"});

        res.json({msg: "Berhasil menghapus ulasan!"});
    } catch (error) {
        console.log(error);
        res.status(500).json({msg: "Terjadi kesalahan dalam menghapus ulasan"})
    }
})

export default router;