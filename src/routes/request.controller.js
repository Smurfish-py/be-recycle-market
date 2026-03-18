import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

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

export const processRequest = async (req, res) => {
    const { id } = req.params;
    const { action } = req.body;

    try {
        const permintaan = await prisma.permintaan.findUnique({
            where: { id: parseInt(id) }
        });

        if (!permintaan) return res.status(404).json({ pesan: "Permintaan tidak ditemukan" });

        if (action === 'DISETUJUI') {
            if (permintaan.tipe === 'BUKA_TOKO') {
                await prisma.toko.update({
                    where: { id: permintaan.idReferensi },
                    data: { shopStatus: 'APPROVE' }
                });
                
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
                await prisma.produk.update({
                    where: { id: permintaan.idReferensi },
                    data: { status: 'LOLOS' }
                });
            }
        } 
        
        else if (action === 'DITOLAK') {
            if (permintaan.tipe === 'JUAL_PRODUK') {
                await prisma.produk.update({
                    where: { id: permintaan.idReferensi },
                    data: { status: 'TIDAK_LOLOS' }
                });
            }
        }

        const updatedPermintaan = await prisma.permintaan.update({
            where: { id: parseInt(id) },
            data: { status: action }
        });

        res.status(200).json({ pesan: `Permintaan berhasil ${action}`, data: updatedPermintaan });

    } catch (error) {
        res.status(500).json({ pesan: "Terjadi kesalahan server", error });
    }
};