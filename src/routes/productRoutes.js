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

const uploadDir = path.join(__dirname, '..', 'uploads', 'products');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        try {
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
            cb(null, uploadDir);
        } catch (error) {
            cb(error);
        }
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
                        nama: true,
                        shopStatus: true
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
    }
});

router.get('/toko/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const produk = await prisma.produk.findMany({
            where: { 
                idToko: Number(id) 
            },
            include: {
                fotoProduk: {},
                toko: {
                    select: {
                        id: true,
                        nama: true,
                        shopStatus: true
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
        res.json(produk);
    } catch (error) {
        console.error({ error: error });
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
            return res.status(204).json({ pesan: "Belum ada produk dengan kategori ini :(" });
        }

        res.json(produk);
    } catch (error) {
        throw error;
    }
});

router.get('/count', async (req, res) => {
    try {
        const [ products, electronics, nonElectronics ] = await prisma.$transaction([
            prisma.produk.count(),
            prisma.produk.count({
                where: {
                    kategori: "ELEKTRONIK"
                }
            }),
            prisma.produk.count({
                where: {
                    kategori: "NON_ELEKTRONIK"
                }
            }),
        ]);

        res.json({
            products,
            electronics,
            nonElectronics
        });
    } catch (error) {
        throw error;
    }
});

router.post('/add', uploadImage.array('photoProduct', 5), async (req, res) => {
    const {
        id, // Ini adalah idToko yang dikirim dari frontend
        nama,
        deskripsi,
        harga,
        jenisHarga,
        deskripsiHarga,
        detailProduk,
        stok, 
        kategori, 
        kualitas
    } = req.body;

    try {
        // 1. Cari User ID berdasarkan Toko ID (Karena model Permintaan butuh idUser)
        const toko = await prisma.toko.findUnique({
            where: { id: Number(id) }
        });

        if (!toko) {
            return res.status(404).json({ message: "Toko tidak ditemukan" });
        }

        // 2. Gunakan transaction agar Produk dan Permintaan sukses dibuat bersamaan
        const [produk, permintaan] = await prisma.$transaction(async (tx) => {
            // A. Buat record Produk dengan status default DALAM_PENINJAUAN
            const newProduk = await tx.produk.create({
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
                    status: "DALAM_PENINJAUAN",
                    kualitas,
                    fotoProduk: {
                        create: req.files.map(photo => ({
                            file: photo.filename,
                        }))
                    }
                }
            });

            // B. Buat record Permintaan untuk dikirim ke Admin
            const newPermintaan = await tx.permintaan.create({
                data: {
                    idUser: toko.idUser,
                    tipe: "JUAL_PRODUK",
                    idReferensi: newProduk.id, // Simpan ID produk di idReferensi
                    keterangan: `Pengajuan produk baru untuk dijual: ${newProduk.nama}`
                }
            });

            return [newProduk, newPermintaan];
        });

        res.status(200).json({ 
            message: `Anda mendaftarkan ${produk.nama} untuk dijual. Kami akan meninjau terlebih dahulu sebelum benar-benar menjual barang anda.`,
            requestStatus: "PENDING"
        });
        
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Terjadi kesalahan internal", error: error.message });
    }
});

// Pastikan Anda mengimpor modul 'path' dan 'fs' di bagian atas file
// const path = require('path');
// const fs = require('fs');

router.delete('/delete/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        const productId = Number(id);

        // 1. Cek dulu apakah produknya ada di database
        const productExist = await prisma.produk.findUnique({
            where: { id: productId }
        });

        if (!productExist) {
            return res.status(404).json({ pesan: "Produk tidak ditemukan" });
        }

        // 2. Ambil data foto yang terkait dengan produk
        const photos = await prisma.fotoProduk.findMany({
            where: { idProduk: productId }
        });

        // 3. Hapus data di database menggunakan transaction
        // (Lakukan database deletion dulu sebelum menghapus file fisik untuk mencegah inkonsistensi)
        await prisma.$transaction([
            prisma.fotoProduk.deleteMany({
                where: { idProduk: Number(productId) }
            }),
            prisma.produk.delete({
                where: { id: Number(productId) }
            }),
            prisma.markah.delete({
                where: { idProduk: Number(productId) }
            }),
            
        ]);

        photos.forEach(photo => {
            const filePath = path.join(uploadDir, photo.file);
            if (fs.existsSync(filePath)) {
                try {
                    fs.unlinkSync(filePath);
                } catch (err) {
                    console.error(`Gagal menghapus file ${filePath}:`, err);
                    // Kita catch error fs agar tidak membuat API crash 
                    // jika file tiba-tiba tidak bisa diakses
                }
            }
        });

        // 5. Kembalikan respon sukses ke Frontend (SANGAT PENTING)
        return res.status(200).json({ 
            pesan: "Produk dan foto berhasil dihapus" 
        });

    } catch (error) {
        // 6. Tangani error database atau server
        console.error("Error menghapus produk:", error);
        return res.status(500).json({ 
            pesan: "Terjadi kesalahan internal server", 
            error: error.message 
        });
    }
});

// Bookmark

router.get('/bookmark/get/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const products = await prisma.markah.findMany({
            where: {
                idUser: Number(id),
            },
            include: {
                user: true,
                toko: true,
                produk: {
                    include: {
                        fotoProduk: true,
                    },
                },
            },
        });

        return res.json(products);
    } catch (error) {
        throw error;
    }
});

router.get('/bookmark/check/:idUser/:idProduct', async (req, res) => {
    const { idUser, idProduct } = req.params;

    try {
        const products = await prisma.markah.count({
            where: {
                idUser: Number(idUser),
                idProduk: Number(idProduct)
            }
        });

        res.json(products);
    } catch (error) {
        throw error;
    }
});

router.post('/bookmark/add/:idUser/:idProduct/:idToko', async (req, res) => {
    const { idUser, idProduct, idToko } = req.params;

    try {
        await prisma.markah.create({
            data: {
                idUser: Number(idUser),
                idProduk: Number(idProduct),
                idToko: Number(idToko)
            }
        });

        return res.json({ msg: "Produk berhasil ditambahkan di markah" });
    } catch (error) {
        throw error;
    }
});

router.delete('/bookmark/delete/:idUser/:idProduct/:idToko', async (req, res) => {
    const { idUser, idProduct, idToko } = req.params;

    try {
        await prisma.markah.deleteMany({
            where: {
                idUser: Number(idUser),
                idProduk: Number(idProduct),
                idToko: Number(idToko)
            }
        })
        
        return res.json({ msg: "Produk berhasil dihapus dari markah" });
    } catch (error) {
        throw error;
    }
});

export default router;