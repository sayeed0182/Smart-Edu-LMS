// scripts/seed.js — Run once to populate sample data for testing
// Usage: node scripts/seed.js

require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const User    = require('./models/User'); 
const Student = require('./models/Student');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/edu-smart';

const seedData = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Student.deleteMany({});
    console.log('🗑️  Cleared existing data');

    // ── Create Faculty User ──────────────────────────────
    const faculty = await User.create({
      name:       'Dr. Sarah Johnson',
      email:      'faculty@edu-smart.com',
      password:   'faculty123',
      role:       'Faculty',
      department: 'Computer Science',
    });
    console.log('👩‍🏫 Faculty created:', faculty.email);

    // ── Create Student Users + Profiles ─────────────────
    const studentsData = [
      {
        user: { name: 'mohammed sayeed',  email: 'mohammedsayeed@gmail.com',  password: 'student123', role: 'Student', department: 'Computer Science' },
        profile: {
          studentId: 'STU-2024-001', department: 'Computer Science',
          semester: 6, batch: '2022-2026',
          attendancePercentage: 85,
          marks: [
            { subject: 'Data Structures',   ca1: 18, ca2: 17, midterm: 26, endterm: 42 },
            { subject: 'Operating Systems', ca1: 16, ca2: 15, midterm: 24, endterm: 38 },
            { subject: 'Database Systems',  ca1: 19, ca2: 18, midterm: 27, endterm: 44 },
          ],
        },
      },
      {
        user: { name: 'Bob Mehta', email: 'bob@edu-smart.com', password: 'student123', role: 'Student', department: 'Computer Science' },
        profile: {
          studentId: 'STU-2024-002', department: 'Computer Science',
          semester: 6, batch: '2022-2026',
          attendancePercentage: 68,
          marks: [
            { subject: 'Data Structures',   ca1: 12, ca2: 14, midterm: 20, endterm: 30 },
            { subject: 'Operating Systems', ca1: 10, ca2: 11, midterm: 18, endterm: 28 },
            { subject: 'Database Systems',  ca1: 13, ca2: 12, midterm: 21, endterm: 32 },
          ],
        },
      },
      {
        user: { name: 'Priya Sharma', email: 'priya@edu-smart.com', password: 'student123', role: 'Student', department: 'Computer Science' },
        profile: {
          studentId: 'STU-2024-003', department: 'Computer Science',
          semester: 6, batch: '2022-2026',
          attendancePercentage: 92,
          marks: [
            { subject: 'Data Structures',   ca1: 20, ca2: 19, midterm: 29, endterm: 48 },
            { subject: 'Operating Systems', ca1: 18, ca2: 20, midterm: 28, endterm: 46 },
            { subject: 'Database Systems',  ca1: 19, ca2: 20, midterm: 30, endterm: 49 },
          ],
        },
      },
    ];

    for (const { user: userData, profile } of studentsData) {
      const user    = await User.create(userData);
      const student = await Student.create({ ...profile, name: userData.name, email: userData.email, userId: user._id });
      user.studentId = student._id;
      await user.save();
      console.log(`👤 Student created: ${userData.email}`);
    }

    console.log('\n🎉 Seed data created successfully!\n');
    console.log('─────────────────────────────────────────');
    console.log('Test Credentials:');
    console.log('  Faculty:  faculty@edu-smart.com / faculty123');
    console.log('  Student:  alice@edu-smart.com  / student123');
    console.log('  Student:  bob@edu-smart.com    / student123');
    console.log('  Student:  priya@edu-smart.com  / student123');
    console.log('─────────────────────────────────────────\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  }
};

seedData();
