import express from 'express';
import user from './routes/userRoutes.js';
import produk from './routes/productRoutes.js';
import toko from './routes/tokoRoutes.js';
import keranjang from './routes/keranjangRoutes.js';
import transaksi from './routes/historiTransaksiRoutes.js';
import penjualan from './routes/historiPenjualanRoutes.js'

import chalk from 'chalk';

const PORT = 3000;
const app = express();

app.use(express.json());

app.use('/api/user', user);
app.use('/api/produk', produk);
app.use('/api/toko', toko);
app.use('/api/keranjang', keranjang);
app.use('/api/transaksi', transaksi);
app.use('/api/penjualan', penjualan);


app.listen(PORT, () => {
    console.log(`
        \n ${chalk.bold.bgWhite('[+]')}${chalk.bgBlue.black(` Server berjalan di http://localhost:${PORT} `)}
        \n ${chalk.bold('Contoh penggunaan API :')} http://localhost:3000/api/user/1
    `);
});