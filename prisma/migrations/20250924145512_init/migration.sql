-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fullname` VARCHAR(191) NOT NULL,
    `username` VARCHAR(30) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastOnline` DATETIME(3) NULL,
    `status` ENUM('ACTIVE', 'BANNED') NOT NULL DEFAULT 'ACTIVE',

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Privilege` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `idUser` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Keranjang` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `idUser` INTEGER NOT NULL,
    `privilege` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Toko` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `namaToko` VARCHAR(30) NOT NULL,
    `deskripsi` VARCHAR(255) NOT NULL,
    `filePfp` VARCHAR(191) NULL,
    `fileBanner` VARCHAR(191) NULL,
    `idUser` INTEGER NOT NULL,

    UNIQUE INDEX `Toko_idUser_key`(`idUser`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Produk` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama` VARCHAR(30) NOT NULL,
    `deskripsi` VARCHAR(255) NOT NULL,
    `harga` INTEGER NOT NULL,
    `jenisHarga` ENUM('PCS', 'PAKET', 'LUSIN') NOT NULL,
    `deskripsiHarga` VARCHAR(30) NULL,
    `idToko` INTEGER NOT NULL,
    `kategori` ENUM('NON_ELEKTRONIK', 'ELEKTRONIK') NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FotoProduk` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `idProduk` INTEGER NOT NULL,
    `file` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Rating` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `idUser` INTEGER NOT NULL,
    `idProduk` INTEGER NOT NULL,
    `rating` TINYINT NOT NULL,
    `komentar` VARCHAR(255) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Privilege` ADD CONSTRAINT `Privilege_idUser_fkey` FOREIGN KEY (`idUser`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Keranjang` ADD CONSTRAINT `Keranjang_idUser_fkey` FOREIGN KEY (`idUser`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Toko` ADD CONSTRAINT `Toko_idUser_fkey` FOREIGN KEY (`idUser`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Produk` ADD CONSTRAINT `Produk_idToko_fkey` FOREIGN KEY (`idToko`) REFERENCES `Toko`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FotoProduk` ADD CONSTRAINT `FotoProduk_idProduk_fkey` FOREIGN KEY (`idProduk`) REFERENCES `Produk`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Rating` ADD CONSTRAINT `Rating_idUser_fkey` FOREIGN KEY (`idUser`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Rating` ADD CONSTRAINT `Rating_idProduk_fkey` FOREIGN KEY (`idProduk`) REFERENCES `Produk`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
