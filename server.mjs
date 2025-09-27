import express from 'express';
import user from './routes/userRoutes.js';
import produk from './routes/productRoutes.js';
import toko from './routes/tokoRoutes.js';
import chalk from 'chalk';

const PORT = 3000;
const app = express();

app.use(express.json());

app.use('/api/user', user);
app.use('/api/produk', produk);
app.use('/api/toko', toko);

app.listen(PORT, () => {
    console.log(`
        \n========================================================
        \n ${chalk.bold.bgGreenBright('[+]')}${chalk.bgBlue.black(`Server berjalan di http://localhost:${PORT}`)}
        \n ${chalk.bold('Contoh penggunaan API :')} http://localhost:3000/api/user/1
        \n========================================================
    `);
});