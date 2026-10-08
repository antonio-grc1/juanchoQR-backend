import 'dotenv/config';
import { PrismaClient, EstadoEvento } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const eventoExistente = await prisma.evento.findFirst({
    where: { titulo: 'Cumple del Grupo 59 Años' },
  });

  if (eventoExistente) {
    console.log('ℹ️ El evento de prueba ya existe con ID:', eventoExistente.id);
    return;
  }

  const evento = await prisma.evento.create({
    data: {
      titulo: 'Cumple del Grupo 59 Años',
      descripcion:
        'Vení a festejar el cumple del grupo en el polideportivo del colegio Peña y a comer locro.',
      imagenUrl: 'images/cumplejuancho.jpg',
      fechaInicio: new Date('2026-11-15T12:00:00Z'),
      fechaFin: new Date('2026-11-15T18:00:00Z'),
      ubicacion: 'Polideportivo Colegio Peña',
      estado: EstadoEvento.PUBLICADO,
      tiposEntrada: {
        create: [
          {
            nombre: 'General',
            precio: 3500.0,
            stockTotal: 200,
            stockDisponible: 200,
            maxPorCompra: 6,
          },
          {
            nombre: 'VIP',
            precio: 6000.0,
            stockTotal: 50,
            stockDisponible: 50,
            maxPorCompra: 4,
          },
          {
            nombre: 'Mesa especial (4 personas)',
            precio: 20000.0,
            stockTotal: 15,
            stockDisponible: 15,
            maxPorCompra: 2,
          },
        ],
      },
    },
    include: {
      tiposEntrada: true,
    },
  });

  console.log('✅ Evento de prueba creado exitosamente:');
  console.log(`   ID:     ${evento.id}`);
  console.log(`   Título: ${evento.titulo}`);
  console.log(`   Tipos de entrada: ${evento.tiposEntrada.length}`);
}

main()
  .catch((e) => {
    console.error('❌ Error al crear evento de prueba:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

