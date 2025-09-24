const express = require('express');
const user = require("./routes/userRoutes");
const produk = require("./routes/productRoutes");
const toko = require("./routes/tokoRoutes");

const PORT = 3000;
const app = express();

app.use(express.json());

app.use('/api/user', user);
app.use('/api/produk', produk);
app.use('/api/toko', toko);

app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});