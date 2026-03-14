import midtransClient from 'midtrans-client';
import { PrismaClient } from '@prisma/client';

const { SERVER_KEY } = process.env;

const prisma = new PrismaClient();
const snap = new midtransClient.Snap({
    isProduction: false,
    serverKey: SERVER_KEY
});

// ==========================================
// 1. MEMBUAT PESANAN (CHECKOUT)
// ==========================================
export const createTransaction = async (req, res) => {
    try {
        const { 
            nama, email, noHp, alamat, kodePos, deskripsi, 
            jenisHarga, // Bernilai 'COD' atau 'E-wallet'
            productId, quantity, userId 
        } = req.body;

        // 1. Cari data produk untuk memastikan harga valid dan mendapatkan idPenjual
        const produk = await prisma.produk.findUnique({
            where: { id: parseInt(productId) },
            include: { toko: true } // Mengambil data toko untuk tahu siapa penjualnya
        });

        if (!produk) {
            return res.status(404).json({ message: "Produk tidak ditemukan" });
        }

        // 2. Hitung Total Harga (termasuk matematika Midtrans)
        const qty = parseInt(quantity);
        const biayaAdmin = jenisHarga === 'COD' ? 0 : 1500;
        const totalBayar = (produk.harga * qty) + biayaAdmin;

        // 3. Simpan Transaksi ke Database (Prisma)
        const transaksi = await prisma.transaksi.create({
            data: {
                idUser: parseInt(userId),
                idProduk: produk.id,
                idPenjual: produk.toko.idUser, // Didapat otomatis dari relasi Toko
                kuantitas: qty,
                harga: totalBayar,
                alamat: alamat,
                kodePos: parseInt(kodePos),
                keterangan: deskripsi || "",
                metode: jenisHarga === 'COD' ? 'LANGSUNG' : 'TRANSFER',
                tanggal: new Date(),
                // status: 'PENDING' // Pastikan Anda sudah menambahkan kolom ini di schema.prisma
            }
        });

        // Format Order ID untuk Midtrans (Ubah Int jadi String)
        const orderIdMidtrans = `TRX-${transaksi.id}`;

        if (jenisHarga === 'COD') {
            return res.status(200).json({ success: true, orderId: orderIdMidtrans });
        }

        // 4. Susun Item Details untuk Midtrans (Menghindari error penjumlahan)
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

        // 5. Minta Token Midtrans
        const parameter = {
            transaction_details: {
                order_id: orderIdMidtrans, // Contoh: "TRX-5"
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

        return res.status(200).json({ success: true, token: transactionMidtrans.token, orderId: orderIdMidtrans });

    } catch (error) {
        console.error("Error createTransaction:", error);
        return res.status(500).json({ message: "Gagal membuat transaksi", error: error.message });
    }
};

// ==========================================
// 2. WEBHOOK (NOTIFIKASI MIDTRANS)
// ==========================================
export const midtransNotification = async (req, res) => {
    try {
        const statusResponse = await snap.transaction.notification(req.body);
        
        const orderIdString = statusResponse.order_id; 
        const transactionStatus = statusResponse.transaction_status;
        const fraudStatus = statusResponse.fraud_status;

        const idTransaksi = parseInt(orderIdString.split('-')[1]); 

        let statusPesanan = 'PENDING';

        if (transactionStatus === 'capture' || transactionStatus === 'settlement') {
            if (fraudStatus === 'accept') {
                statusPesanan = 'PAID'; 
            }
        } else if (transactionStatus === 'cancel' || transactionStatus === 'deny' || transactionStatus === 'expire') {
            statusPesanan = 'FAILED'; 
        }

        // 1. UPDATE STATUS TRANSAKSI
        const transaksiUpdate = await prisma.transaksi.update({
            where: { id: idTransaksi },
            data: { status: statusPesanan }
        });

        // 2. JIKA LUNAS, TAMBAHKAN KE TABEL PENJUALAN
        if (statusPesanan === 'PAID') {
            // Cek dulu apakah sudah ada di tabel Penjualan agar tidak duplikat 
            // (karena Midtrans kadang mengirim notifikasi yang sama lebih dari sekali)
            const cekPenjualan = await prisma.penjualan.findFirst({
                where: {
                    idProduk: transaksiUpdate.idProduk,
                    idPembeli: transaksiUpdate.idUser,
                    tanggal: transaksiUpdate.tanggal
                }
            });

            if (!cekPenjualan) {
                // Sesuai skema Anda: idUser = Penjual, idPembeli = User yang beli
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

// ==========================================
// 3. MENGAMBIL HISTORI TRANSAKSI USER
// ==========================================
export const getHistoriTransaksi = async (req, res) => {
    try {
        const userId = parseInt(req.params.id);

        const histori = await prisma.transaksi.findMany({
            where: { idUser: userId },
            include: {
                produk: {
                    include: {
                        fotoProduk: true, // Ambil relasi foto agar bisa ditampilkan di Frontend
                        toko: true        // Ambil relasi toko
                    }
                },
                penjual: true // Ambil info penjual
            },
            orderBy: { tanggal: 'desc' }
        });

        return res.status(200).json(histori);

    } catch (error) {
        console.error("Error getHistori:", error);
        return res.status(500).json({ message: "Gagal mengambil histori" });
    }
};