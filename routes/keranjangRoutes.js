const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
    try {
        const daftarKeranjang = await prisma.keranjang.findMany();
        res.json(daftarKeranjang);
    } catch (error) {
        console.error({ error: error });
    } finally {
        prisma.$disconnect();
    }
});

module.exports = router;