import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

/**
 * Seeds the database with the same demo data from the original DbContext.jsx.
 * Safe to run multiple times — uses upsert to avoid duplicates.
 */
async function seed() {
  console.log('🌱 Seeding TTU Dashboard database...\n');

  // --- Users ---
  const password = await bcrypt.hash('admin123', 12);
  const lecturerPassword = await bcrypt.hash('lecturer123', 12);
  const studentPassword = await bcrypt.hash('student123', 12);
  const headPassword = await bcrypt.hash('head123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@ttu.edu.gh' },
    update: {},
    create: {
      name: 'Dr. Rockson (Head of Admin)',
      email: 'admin@ttu.edu.gh',
      passwordHash: password,
      role: 'admin',
      department: 'Graphic Design',
      designation: 'Head of Department',
      staffId: 'ADM-0001'
    }
  });
  console.log('  ✓ Admin:', admin.name);

  const lecturer = await prisma.user.upsert({
    where: { email: 'lecturer@ttu.edu.gh' },
    update: {},
    create: {
      name: 'Prof. Andrews K. Mensah',
      email: 'lecturer@ttu.edu.gh',
      passwordHash: lecturerPassword,
      role: 'lecturer',
      department: 'Graphic Design',
      courses: ['Layout Design II', 'Vector Graphics I', 'Visual Portfolio Prep'],
      staffId: 'LEC-0001'
    }
  });
  console.log('  ✓ Lecturer:', lecturer.name);

  const student = await prisma.user.upsert({
    where: { email: 'student@ttu.edu.gh' },
    update: {},
    create: {
      name: 'Emmanuel Rockson',
      email: 'student@ttu.edu.gh',
      passwordHash: studentPassword,
      role: 'student',
      department: 'Graphic Design',
      year: 'Year 3',
      studentId: '0420210088'
    }
  });
  console.log('  ✓ Student:', student.name);

  const studentHead = await prisma.user.upsert({
    where: { email: 'studenthead@ttu.edu.gh' },
    update: {},
    create: {
      name: 'Class Representative',
      email: 'studenthead@ttu.edu.gh',
      passwordHash: headPassword,
      role: 'student_head',
      department: 'Graphic Design',
      year: 'Year 3',
      studentId: '0420210001'
    }
  });
  console.log('  ✓ Student Head:', studentHead.name);

  // --- Deadlines ---
  const deadlinesCount = await prisma.deadline.count();
  if (deadlinesCount === 0) {
    await prisma.deadline.createMany({
      data: [
        {
          title: 'Layout & Page Design Project',
          description: 'Design and submit a 16-page magazine layout using Adobe InDesign. Export as PDF with print marks.',
          course: 'Layout Design II',
          dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
          type: 'assignment',
          authorId: lecturer.id
        },
        {
          title: 'Typography & Logo Presentation',
          description: 'Submit vector design concepts for the TTU Campus Beautification brand identity project.',
          course: 'Vector Graphics I',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          type: 'project',
          authorId: lecturer.id
        },
        {
          title: 'End of Semester Theory Exam',
          description: 'Written exam testing core layout grids, typesetting rules, and prepress processes.',
          course: 'Layout Design II',
          dueDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
          type: 'examination',
          authorId: admin.id
        }
      ]
    });
    console.log('  ✓ 3 Deadlines created');
  } else {
    console.log(`  ⊘ Deadlines already exist (${deadlinesCount}), skipping`);
  }

  // --- Events ---
  const eventsCount = await prisma.event.count();
  if (eventsCount === 0) {
    await prisma.event.createMany({
      data: [
        {
          title: 'UX/UI Industry Seminar & Workshop',
          description: 'A practical masterclass on Figma and UX research led by senior designers from Google and TTU Alumni.',
          location: 'TTU Creative Arts Main Auditorium',
          eventDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          eventTime: '10:00 AM',
          type: 'workshop',
          organizer: 'Graphic Design Dept',
          authorId: admin.id
        },
        {
          title: 'Annual Department Design Competition',
          description: 'Theme: "Design for Social Change in Ghana". Submit posters and branding items to win laptops and internship opportunities.',
          location: 'Graphic Design Exhibition Gallery',
          eventDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          eventTime: '09:00 AM',
          type: 'competition',
          organizer: 'TTU Creative Arts Guild',
          authorId: admin.id
        },
        {
          title: 'Emergency Faculty Board Meeting',
          description: 'Urgent meeting regarding the upcoming end-of-semester examinations and studio cleanups.',
          location: 'Department Board Room',
          eventDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
          eventTime: '02:00 PM',
          type: 'meeting',
          organizer: 'HOD Office',
          authorId: admin.id
        }
      ]
    });
    console.log('  ✓ 3 Events created');
  } else {
    console.log(`  ⊘ Events already exist (${eventsCount}), skipping`);
  }

  // --- Announcements ---
  const announcementsCount = await prisma.announcement.count();
  if (announcementsCount === 0) {
    await prisma.announcement.createMany({
      data: [
        {
          title: 'Welcome to the Second Semester',
          content: 'We welcome all graphic design students back to campus. Studio card collections are now active at the HOD Office.',
          category: 'notice',
          isPinned: true,
          authorId: admin.id
        },
        {
          title: 'Vectr Studio License Extension',
          content: 'TTU has extended student licenses for Adobe Creative Cloud. Retrieve your custom code from your class representative.',
          category: 'update',
          isPinned: false,
          authorId: admin.id
        },
        {
          title: 'Postponement of Practical Submissions',
          content: 'Please note that the deadline for Vector Graphics Studio Work 1 has been moved to next Friday due to computer lab maintenance.',
          category: 'calendar',
          isPinned: false,
          authorId: lecturer.id
        }
      ]
    });
    console.log('  ✓ 3 Announcements created');
  } else {
    console.log(`  ⊘ Announcements already exist (${announcementsCount}), skipping`);
  }

  // --- Timetable ---
  const timetableCount = await prisma.timetableSlot.count();
  if (timetableCount === 0) {
    await prisma.timetableSlot.createMany({
      data: [
        { day: 'Monday', time: '08:30 AM - 11:30 AM', course: 'Layout Design II', room: 'Lab 3 (Mac Lab)', year: 'All Years' },
        { day: 'Tuesday', time: '01:00 PM - 03:00 PM', course: 'Art History & Theory', room: 'Lecture Hall C', year: 'All Years' },
        { day: 'Wednesday', time: '10:00 AM - 01:00 PM', course: 'Vector Graphics I', room: 'Lab 1', year: 'All Years' },
        { day: 'Thursday', time: '08:30 AM - 10:30 AM', course: 'Visual Portfolio Prep', room: 'Studio B', year: 'All Years' },
        { day: 'Friday', time: '02:00 PM - 04:00 PM', course: 'Design Workshop Seminar', room: 'Auditorium', year: 'All Years' }
      ]
    });
    console.log('  ✓ 5 Timetable slots created');
  } else {
    console.log(`  ⊘ Timetable already populated (${timetableCount}), skipping`);
  }

  // --- WhatsApp Class Groups ---
  const groups = [
    { year: 'Year 1', title: 'TTU Graphic Design Year 1 Class Group', headName: 'Class Representative (Year 1)', headId: 'head_y1', headPhone: '233240000001', inviteLink: 'https://chat.whatsapp.com/invite/ttu-graphic-design-y1' },
    { year: 'Year 2', title: 'TTU Graphic Design Year 2 Class Group', headName: 'Class Representative (Year 2)', headId: 'head_y2', headPhone: '233240000002', inviteLink: 'https://chat.whatsapp.com/invite/ttu-graphic-design-y2' },
    { year: 'Year 3', title: 'TTU Graphic Design Year 3 Class Group', headName: 'Class Representative', headId: studentHead.id, headPhone: '233240000003', inviteLink: 'https://chat.whatsapp.com/invite/ttu-graphic-design-y3' },
    { year: 'Year 4', title: 'TTU Graphic Design Year 4 Class Group', headName: 'Class Representative (Year 4)', headId: 'head_y4', headPhone: '233240000004', inviteLink: 'https://chat.whatsapp.com/invite/ttu-graphic-design-y4' }
  ];
  for (const g of groups) {
    await prisma.classWhatsAppGroup.upsert({
      where: { year: g.year },
      update: { title: g.title, headName: g.headName, headPhone: g.headPhone, inviteLink: g.inviteLink },
      create: g
    });
  }
  console.log('  ✓ 4 WhatsApp class groups seeded');

  console.log('\n✅ Database seeded successfully!');
  console.log('\n  Demo accounts:');
  console.log('  ┌─────────────────────────┬───────────────┬──────────────┐');
  console.log('  │ Email                   │ Password      │ Role         │');
  console.log('  ├─────────────────────────┼───────────────┼──────────────┤');
  console.log('  │ admin@ttu.edu.gh        │ admin123      │ admin        │');
  console.log('  │ lecturer@ttu.edu.gh     │ lecturer123   │ lecturer     │');
  console.log('  │ student@ttu.edu.gh      │ student123    │ student      │');
  console.log('  │ studenthead@ttu.edu.gh  │ head123       │ student_head │');
  console.log('  └─────────────────────────┴───────────────┴──────────────┘');

  await prisma.$disconnect();
}

seed().catch(error => {
  console.error('❌ Seed failed:', error);
  prisma.$disconnect();
  process.exit(1);
});
