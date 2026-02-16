import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

import express from 'express';
import multer from 'multer';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
import { PrismaClient } from '@prisma/client';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, '..', 'uploads', 'user', 'shop', 'images');

const {JWT_SECRET, TOKEN_DURATION} = process.env;


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        try {
            if(!fs.existsSync(uploadDir)) {
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

router.get('/', async (req, res) => {
    try {
        const toko = await prisma.toko.findMany();
        res.json(toko);
    } catch (error) {
        console.error(error);
    }
}); 

router.get('/data/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const toko = await prisma.toko.findUnique({
            where: {
                id: Number(id)
            }
        });

        if (!toko) {
            return res.status(404).send({ message: "Toko tidak ditemukan" });
        }
        res.json(toko);
    } catch (error) {
        console.error({ error: error });
    }
});

router.get('/data/user/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const toko = await prisma.toko.findMany({
            where: {
                idUser: Number(id)
            }
        });

        res.json(toko);
    } catch (error) {
        console.error({ error: error });
    }
});

router.post('/create', async (req, res) => {
    const { idUser, nama, deskripsi, noHp} = req.body;
    try {
        const checkToko = await prisma.toko.count({
            where: { 
                idUser: Number(idUser)
            }
        });

        if (checkToko < 1) {
            await prisma.$transaction([
                prisma.toko.create({
                    data: {
                        nama: nama,
                        deskripsi: deskripsi,
                        idUser: Number(idUser)
                    }
                }),
                prisma.user.update({
                    where: {
                        id: Number(idUser)
                    },
                    data: {
                        noHp
                    }
                }),
                prisma.privilege.update({
                    where: {
                        idUser: Number(idUser)
                    },
                    data: {
                        privilege: "PARTNER"
                    }
                })
            ]);
            
            const user = await prisma.user.findUnique({
                where: {
                    id: Number(idUser)
                },
                include: {
                    privilege: {
                        select: {
                            privilege: true
                        }
                    },
                    toko: {
                        select: {
                            id: true
                        }
                    }
                }
            });

            const token = jwt.sign({
                    id: user.id,
                    email: user.email,
                    password: user.password,
                    privilege: user.privilege[0]?.privilege || null,
                    idToko: user.toko?.[0]?.id || null
                },
                JWT_SECRET,
                { expiresIn: TOKEN_DURATION }
            );

            res.json({ 
                message: "Toko telah berhasil di daftarkan!",
                token
            });
        
        } else {
            return res.status(400).json({ message: 'Toko sudah terdaftar' });
        }
    } catch (error) {
        console.error({ error: error });
    }
});

router.patch('/update/:id', uploadImage.fields([
    { name: "pfp", maxCount: 1},
    { name: "banner", maxCount: 1 }
]), async (req, res) => {
    const { id } = req.params;
    try {
        const checkToko = await prisma.toko.findUnique({
            where: { id: Number(id) }
        });

        if (!checkToko) {
            return res.status(404).json({ message: "Toko tidak ditemukan!" });
        }

        const pfp = req.files["pfp"] ? req.files["pfp"][0].filename : null;
        const banner = req.files["banner"] ? req.files["banner"][0].filename : null;

        await prisma.toko.update({
            where: { 
                id: Number(id)
            },
            data: {
                filePfp: pfp,
                fileBanner: banner,
                ...req.body
            }
        });
        res.status(201).json({ message: "Perubahan disimpan!" });
    } catch (error) {
        console.error({ error: error });
    }
});

router.delete('/delete/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const checkToko = await prisma.toko.findUnique({
            where: { id: Number(id) }
        });

        if (checkToko) {
            await prisma.toko.delete({
                where: { id: Number(id) }
            });
            res.json({ message: "Toko berhasil dihapus" });
        } else {
            res.status(404).json({ message: "Toko tidak ditemukan" });
        }
    } catch (error) {
        console.error({ error: error });
    }
});

export default router;