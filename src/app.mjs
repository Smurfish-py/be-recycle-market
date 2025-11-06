import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import 'dotenv/config';

import user  from './routes/userRoutes.js';
import produk from './routes/productRoutes.js';
import toko from './routes/tokoRoutes.js';
import keranjang from './routes/keranjangRoutes.js';
import transaksi from './routes/historiTransaksiRoutes.js';
import penjualan from './routes/historiPenjualanRoutes.js'
import path from 'path';

const app = express();
const WEB_URL = process.env.WEB_URL;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(cors({
    origin: WEB_URL,
    methods: ["GET", "POST", "PATCH", "DELETE"]
}));

app.use('/api/user', user);
app.use('/api/produk', produk);
app.use('/api/toko', toko);
app.use('/api/keranjang', keranjang);
app.use('/api/transaksi', transaksi);
app.use('/api/penjualan', penjualan);
app.use('/api/images/products', express.static(path.join(__dirname, 'img', 'products')));
app.use('/api/images/users', express.static(path.join(__dirname, 'img', 'products')));

export default app;
