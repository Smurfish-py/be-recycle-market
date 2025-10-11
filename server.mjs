import app from './src/app.mjs'
import chalk from 'chalk';
import 'dotenv/config'

let PORT = process.env.PORT;

app.listen(PORT, () => {
    console.log(`
        \n ${chalk.bold.bgWhite('[+]')}${chalk.bgBlue.black(` Server berjalan di http://localhost:${PORT} `)}
        \n ${chalk.bold('Contoh penggunaan API :')} http://localhost:3000/api/user/1
    `);
});