import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2] || 'admin@sistemaqr.com';
  const password = process.argv[3] || 'admin123';
  const nombre = process.argv[4] || 'Administrador';

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.usuario.upsert({
    where: { email },
    update: { passwordHash, nombre, rol: 'ADMIN' },
    create: {
      email,
      nombre,
      passwordHash,
      rol: 'ADMIN',
    },
  });

  console.log('✅ Usuario admin creado/actualizado:');
  console.log(`   Email:  ${admin.email}`);
  console.log(`   Nombre: ${admin.nombre}`);
  console.log(`   Rol:    ${admin.rol}`);
  console.log(`   ID:     ${admin.id}`);
}

main()
  .catch((e) => {
    console.error('❌ Error al crear admin:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
