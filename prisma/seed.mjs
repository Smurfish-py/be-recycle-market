import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.upsert({
        where: { email: 'admin@recycle.com' },
        update: {},
        create: {
            fullname: 'Super Admin',
            username: 'admin',
            email: 'admin@recycle.com',
            password: hashedPassword,
            privilege: {
                create: { privilege: 'ADMIN' }
            }
        }
    });
    console.log({ admin });
}

main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect());