const express = require('express');
const user = require("./routes/userRoutes");

const PORT = 3000;
const app = express();

app.use(express.json());
app.use('/users', user);

app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});