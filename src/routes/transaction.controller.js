import midtransClient from 'midtrans-client';
import { PrismaClient } from '@prisma/client';

const { SERVER_KEY } = process.env;

const prisma = new PrismaClient();
const snap = new midtransClient.Snap({
    isProduction: false,
    serverKey: SERVER_KEY
});

export const createTransaction = async (req, res) => {
    try {
        const { 
            nama, email, noHp, alamat, kodePos, deskripsi, 
            jenisHarga,
            productId, quantity, userId 
        } = req.body;

        const produk = await prisma.produk.findUnique({
            where: { id: parseInt(productId) },
            include: { toko: true }
        });

        if (!produk) return res.status(404).json({ message: "Produk tidak ditemukan" });

        const qty = parseInt(quantity);
        if (produk.stok < qty) {
            return res.status(400).json({ message: "Stok produk tidak mencukupi" });
        }

        const isBebasAdmin = (jenisHarga === 'COD' || jenisHarga === 'Barter');
        const biayaAdmin = isBebasAdmin ? 0 : 1500;
        const totalBayar = (produk.harga * qty) + biayaAdmin;

        let metodeBayar = 'TRANSFER';
        if (jenisHarga === 'COD') metodeBayar = 'LANGSUNG';
        else if (jenisHarga === 'Barter') metodeBayar = 'BARTER';

        const transaksi = await prisma.transaksi.create({
            data: {
                idUser: parseInt(userId),
                idProduk: produk.id,
                idPenjual: produk.toko.idUser,
                kuantitas: qty,
                harga: totalBayar,
                nama: nama,
                email: email,
                noHp: noHp,
                alamat: alamat,
                kodePos: kodePos,
                keterangan: deskripsi || "",
                metode: metodeBayar,
                tanggal: new Date(),
            }
        });

        await prisma.produk.update({
            where: { id: produk.id },
            data: { 
                stok: { decrement: qty }
            }
        });

        const orderIdMidtrans = `TRX-${transaksi.id}-${Date.now()}`;

        if (isBebasAdmin) {
            return res.status(200).json({ success: true, orderId: orderIdMidtrans });
        }

        const item_details = [{
            id: produk.id.toString(),
            price: produk.harga,
            quantity: qty,
            name: produk.nama.substring(0, 50)
        }];

        if (biayaAdmin > 0) {
            item_details.push({
                id: "FEE-ADMIN",
                price: biayaAdmin,
                quantity: 1,
                name: "Biaya Administrasi"
            });
        }

        const parameter = {
            transaction_details: {
                order_id: orderIdMidtrans, 
                gross_amount: totalBayar
            },
            customer_details: {
                first_name: nama,
                email: email,
                phone: noHp
            },
            item_details: item_details
        };

        const transactionMidtrans = await snap.createTransaction(parameter);

        return res.status(200).json({ 
            success: true, 
            token: transactionMidtrans.token, 
            orderId: orderIdMidtrans 
        });

    } catch (error) {
        console.error("Error createTransaction:", error);
        return res.status(500).json({ message: "Gagal membuat transaksi", error: error.message });
    }
};

export const midtransNotification = async (req, res) => {
    try {
        const statusResponse = await snap.transaction.notification(req.body);
        
        const orderIdString = statusResponse.order_id; 
        const transactionStatus = statusResponse.transaction_status;
        const fraudStatus = statusResponse.fraud_status;

        const idTransaksi = parseInt(orderIdString.split('-')[1]); 

        if (transactionStatus === 'cancel' || transactionStatus === 'deny' || transactionStatus === 'expire') {
            const trx = await prisma.transaksi.findUnique({
                where: { id: idTransaksi }
            });

            if (trx) {

                await prisma.produk.update({
                    where: { id: trx.idProduk },
                    data: { stok: { increment: trx.kuantitas } }
                });

                await prisma.transaksi.delete({
                    where: { id: idTransaksi }
                });
                console.log(`[HAPUS & KEMBALIKAN STOK] Transaksi TRX-${idTransaksi} dibatalkan.`);
            }
            return res.status(200).json({ status: "deleted" });
        }

        if ((transactionStatus === 'capture' || transactionStatus === 'settlement') && fraudStatus === 'accept') {

            const transaksiUpdate = await prisma.transaksi.update({
                where: { id: idTransaksi },
                data: { status: 'PAID' }
            });

            const cekPenjualan = await prisma.penjualan.findFirst({
                where: {
                    idProduk: transaksiUpdate.idProduk,
                    idPembeli: transaksiUpdate.idUser,
                    tanggal: transaksiUpdate.tanggal
                }
            });

            if (!cekPenjualan) {
                await prisma.penjualan.create({
                    data: {
                        idUser: transaksiUpdate.idPenjual, 
                        idProduk: transaksiUpdate.idProduk,
                        idPembeli: transaksiUpdate.idUser, 
                        kuantitas: transaksiUpdate.kuantitas,
                        keterangan: transaksiUpdate.keterangan || "Lunas via Midtrans",
                        tanggal: new Date()
                    }
                });
                console.log(`[SUKSES] Data penjualan baru ditambahkan untuk TRX-${idTransaksi}`);
            }
        }

        return res.status(200).json({ status: "success" });
        
    } catch (error) {
        console.error("Webhook error:", error);
        return res.status(500).json({ message: "Gagal memproses notifikasi" });
    }
};

export const getHistoriTransaksi = async (req, res) => {
    try {
        const userId = parseInt(req.params.id);

        const histori = await prisma.transaksi.findMany({
            where: { idUser: userId },
            include: {
                produk: {
                    include: {
                        fotoProduk: true,
                        toko: true    
                    }
                },
                penjual: true
            },
            orderBy: { tanggal: 'desc' }
        });

        return res.status(200).json(histori);

    } catch (error) {
        console.error("Error getHistori:", error);
        return res.status(500).json({ message: "Gagal mengambil histori" });
    }
};

export const cancelTransactionManual = async (req, res) => {
    try {
        const orderIdString = req.params.orderId; 
        const idTransaksi = parseInt(orderIdString.split('-')[1]);
        const trx = await prisma.transaksi.findUnique({
            where: { id: idTransaksi }
        });

        if (trx) {
            await prisma.produk.update({
                where: { id: trx.idProduk },
                data: { stok: { increment: trx.kuantitas } }
            });

            await prisma.transaksi.delete({
                where: { id: idTransaksi }
            });
        }

        return res.status(200).json({ message: "Transaksi berhasil dibatalkan dan stok telah dikembalikan" });
    } catch (error) {
        return res.status(500).json({ message: "Gagal atau sudah dihapus" });
    }
};