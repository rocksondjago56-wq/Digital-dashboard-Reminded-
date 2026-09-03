import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedWhatsAppGroups() {
  console.log('Seeding default WhatsApp class groups into Supabase...');

  const groups = [
    {
      year: 'Year 1',
      title: 'TTU Graphic Design Year 1 Class Group',
      headName: 'Class Representative (Year 1)',
      headId: 'head_y1',
      headPhone: '233240000001',
      inviteLink: 'https://chat.whatsapp.com/invite/ttu-graphic-design-y1'
    },
    {
      year: 'Year 2',
      title: 'TTU Graphic Design Year 2 Class Group',
      headName: 'Class Representative (Year 2)',
      headId: 'head_y2',
      headPhone: '233240000002',
      inviteLink: 'https://chat.whatsapp.com/invite/ttu-graphic-design-y2'
    },
    {
      year: 'Year 3',
      title: 'TTU Graphic Design Year 3 Class Group',
      headName: 'Class Representative',
      headId: 'head_y3',
      headPhone: '233240000003',
      inviteLink: 'https://chat.whatsapp.com/invite/ttu-graphic-design-y3'
    },
    {
      year: 'Year 4',
      title: 'TTU Graphic Design Year 4 Class Group',
      headName: 'Class Representative (Year 4)',
      headId: 'head_y4',
      headPhone: '233240000004',
      inviteLink: 'https://chat.whatsapp.com/invite/ttu-graphic-design-y4'
    }
  ];

  for (const g of groups) {
    await prisma.classWhatsAppGroup.upsert({
      where: { year: g.year },
      update: {
        title: g.title,
        headName: g.headName,
        headId: g.headId,
        headPhone: g.headPhone,
        inviteLink: g.inviteLink
      },
      create: g
    });
    console.log(`  ✓ Seeded ${g.title}`);
  }

  console.log('✅ WhatsApp class groups seeded!');
  await prisma.$disconnect();
}

seedWhatsAppGroups();
