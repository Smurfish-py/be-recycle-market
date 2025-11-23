import express from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const prisma = new PrismaClient();
const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, '..', 'img', 'products');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

const uploadImage = multer({ storage });

router.get('/', async (req, res)=> {
    try {
        const produk = await prisma.produk.findMany({
            include: {
                toko: {},
                fotoProduk: {
                    take: 1,
                    orderBy: {id: 'asc'}
                }
            },
            where: {
                status: 'LOLOS'
            },
            orderBy: {id: 'desc'}
        });
        res.status(200).json(produk);
    } catch (error) {
        console.error({ error: error });
    } finally {
        prisma.$disconnect();
    }
});

router.get('/search/:nama', async (req, res) => {
    const { nama } = req.params;
    try {
        const produk = await prisma.produk.findMany({
            include: {
                toko: {},
                fotoProduk: {
                    take: 1,
                    orderBy: {id: 'asc'}
                }
            },
            where: {
                nama: {
                    contains: nama,
                },
            },
            orderBy: {id: 'desc'}
        });

        if (produk.length < 1) return res.json({ message: `Tidak ada produk yang namanya mengandung : ${nama}` });

        res.status(200).json(produk);
    } catch (error) {
        throw error;
    }
});

router.get('/data/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const produk = await prisma.produk.findUnique({
            where: {
                id: Number(id)
            },
            include: {
                fotoProduk: {},
                toko: {
                    select: {
                        nama: true
                    }
                },
                rating: {
                    include: {
                        user: {
                            select: {
                                username: true
                            }
                        }
                    }
                }
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
            include: {}
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
            where: { 
                kategori: kategori,
                status: 'LOLOS'
            },
            include: {
                toko: {},
                fotoProduk: {
                    take: 1,
                    orderBy: {id: 'asc'}
                }
            },
            orderBy: {id: 'desc'}
        });
        
        if (produk.length == 0) {
            res.status(204).json({ pesan: "Belum ada produk dengan kategori ini :(" });
        }

        res.json(produk);
    } catch (error) {
        throw error;
    } finally {
        prisma.$disconnect();
    }
});

router.post('/add', uploadImage.array('photoProduct', 5), async (req, res) => {
    const {
        id,
        nama,deskripsi,
        harga,
        jenisHarga,
        deskripsiHarga,
        detailProduk,
        stok, 
        kategori, 
        kualitas
    } = req.body;

    try {
        const produk = await prisma.produk.create({
            data: {
                nama,
                deskripsi,
                harga: Number(harga),
                jenisHarga,
                deskripsiHarga,
                detail: detailProduk,
                stok: Number(stok),
                idToko: Number(id),
                kategori,
                status: "LOLOS",
                kualitas,
                fotoProduk: {
                    create: req.files.map(photo => ({
                        file: photo.filename,
                    }))
                }
            }
        });

        await prisma.fotoProduk.createMany({ data: files });
        res.json({ message: `Anda mendaftarkan ${produk.nama} untuk dijual. Kami akan meninjau terlebih dahulu sebelum benar-benar menjual barang anda.` });
        
    } catch (error) {
        console.log(error);
        throw error.message;
    } finally {
        prisma.$disconnect();
    }
});

router.delete('/delete/:id', async (req, res) => {
    const { id } = req.params;
    try {

        const photos = await prisma.fotoProduk.findMany({
            where: {
                idProduk: Number(id)
            }
        });

        photos.forEach(photo => {
            if (fs.existsSync(uploadDir + '/' + photo.file)) {
                fs.unlinkSync(uploadDir + '/' + photo.file);
            }
        });

        await prisma.$transaction([
            prisma.fotoProduk.deleteMany({
                where: {
                    idProduk: Number(id)
                }
            }),
            prisma.produk.delete({
                where: {
                    id: Number(id)
                }
            })
        ]);

        res.json({ message: "Produk berhasil dihapus" });
    } catch (error) {
        throw error;
    }
});

export default router;