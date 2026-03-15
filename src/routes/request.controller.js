// BACKEND: file controller permintaan (misal: backend/controllers/requestController.js)
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Mengambil semua request yang masih PENDING
export const getPendingRequests = async (req, res) => {
    try {
        const requests = await prisma.permintaan.findMany({
            where: { status: 'PENDING' },
            include: { 
                user: { select: { fullname: true, email: true } } 
            },
            orderBy: { tanggal: 'desc' }
        });
        res.status(200).json(requests);
    } catch (error) {
        res.status(500).json({ pesan: "Gagal mengambil data permintaan", error });
    }
};

// Memproses persetujuan atau penolakan
export const processRequest = async (req, res) => {
    const { id } = req.params;
    const { action } = req.body; // 'DISETUJUI' atau 'DITOLAK'

    try {
        // 1. Cari data permintaan
        const permintaan = await prisma.permintaan.findUnique({
            where: { id: parseInt(id) }
        });

        if (!permintaan) return res.status(404).json({ pesan: "Permintaan tidak ditemukan" });

        // 2. Logika jika DISETUJUI
        if (action === 'DISETUJUI') {
            if (permintaan.tipe === 'BUKA_TOKO') {
                // Update status toko
                await prisma.toko.update({
                    where: { id: permintaan.idReferensi },
                    data: { shopStatus: 'APPROVE' }
                });
                
                // Tambahkan privilege PARTNER ke User
                // Cek dulu apakah sudah punya
                const existingPrivilege = await prisma.privilege.findUnique({ where: { idUser: permintaan.idUser }});
                if (existingPrivilege) {
                    await prisma.privilege.update({
                        where: { idUser: permintaan.idUser },
                        data: { privilege: 'PARTNER' }
                    });
                } else {
                    await prisma.privilege.create({
                        data: { idUser: permintaan.idUser, privilege: 'PARTNER' }
                    });
                }
            } 
            else if (permintaan.tipe === 'JUAL_PRODUK') {
                // Update status produk
                await prisma.produk.update({
                    where: { id: permintaan.idReferensi },
                    data: { status: 'LOLOS' }
                });
            }
        } 
        
        // 3. Logika jika DITOLAK
        else if (action === 'DITOLAK') {
            if (permintaan.tipe === 'JUAL_PRODUK') {
                await prisma.produk.update({
                    where: { id: permintaan.idReferensi },
                    data: { status: 'TIDAK_LOLOS' }
                });
            }
            // Jika BUKA_TOKO ditolak, biarkan shopStatus PENDING atau hapus data tokonya (Tergantung kebijakan Anda)
        }

        // 4. Update status permintaan itu sendiri
        const updatedPermintaan = await prisma.permintaan.update({
            where: { id: parseInt(id) },
            data: { status: action }
        });

        res.status(200).json({ pesan: `Permintaan berhasil ${action}`, data: updatedPermintaan });

    } catch (error) {
        res.status(500).json({ pesan: "Terjadi kesalahan server", error });
    }
};