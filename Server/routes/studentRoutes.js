// routes/studentRoutes.js
const express = require('express');
const Student = require('../models/Student');
const { protect, restrictTo } = require('../middleware/auth');
const { getSocketIO } = require('../socket');

const router = express.Router();

router.use(protect);

const emitLowAttendanceAlert = (studentDoc) => {
  if (!studentDoc || typeof studentDoc.attendancePercentage !== 'number') return;
  if (studentDoc.attendancePercentage >= 75) return;

  const io = getSocketIO();
  if (!io) return;

  io.emit('low-attendance-alert', {
    studentId: studentDoc.studentId,
    studentMongoId: studentDoc._id.toString(),
    name: studentDoc.name,
    percentage: studentDoc.attendancePercentage,
    department: studentDoc.department,
  });
};

// GET /api/students
router.get('/', async (req, res) => {
  try {
    let students;
    if (req.user.role === 'Faculty') {
      const filter = {};
      if (req.query.department) filter.department = req.query.department;
      students = await Student.find(filter).select('-attendanceRecords');
    } else {
      students = await Student.find({ userId: req.user._id });
    }
    res.status(200).json({ success: true, count: students.length, data: students });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/students/:id
router.get('/:id', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    if (req.user.role === 'Student' && student.userId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    res.status(200).json({ success: true, data: student });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/students (Faculty only)
router.post('/', restrictTo('Faculty'), async (req, res) => {
  try {
    const student = await Student.create(req.body);
    res.status(201).json({ success: true, data: student });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: 'Student ID or email already exists.' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/students/:id/marks (Faculty only) - update one subject
router.put('/:id/marks', restrictTo('Faculty'), async (req, res) => {
  try {
    const { subject, ca1, ca2, ca3, midterm, endterm } = req.body;

    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    const existingIdx = student.marks.findIndex((m) => m.subject === subject);
    if (existingIdx >= 0) {
      student.marks[existingIdx] = { subject, ca1, ca2, ca3, midterm, endterm };
    } else {
      student.marks.push({ subject, ca1, ca2, ca3, midterm, endterm });
    }

    await student.save();
    emitLowAttendanceAlert(student);
    res.status(200).json({ success: true, data: student });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/students/:id/marks/batch (Faculty only)
// Body: { marksData: [{ subject, ca1, ca2, ca3, midterm, endterm }] }
router.put('/:id/marks/batch', restrictTo('Faculty'), async (req, res) => {
  try {
    const { marksData } = req.body;

    if (!Array.isArray(marksData) || marksData.length === 0) {
      return res.status(400).json({ success: false, message: 'marksData array is required.' });
    }

    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    marksData.forEach((row) => {
      const subjectName = row.subject || 'General';
      const idx = student.marks.findIndex((m) => m.subject === subjectName);
      const nextMarks = {
        subject: subjectName,
        ca1: Number(row.ca1) || 0,
        ca2: Number(row.ca2) || 0,
        ca3: Number(row.ca3) || 0,
        midterm: Number(row.midterm) || 0,
        endterm: Number(row.endterm) || 0,
      };

      if (idx >= 0) {
        student.marks[idx] = nextMarks;
      } else {
        student.marks.push(nextMarks);
      }
    });

    await student.save();
    emitLowAttendanceAlert(student);

    res.status(200).json({ success: true, data: student });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/students/marks/batch (Faculty only)
// Body: { marksData: [{ studentId, subject, ca1, ca2, ca3, midterm, endterm }] }
router.put('/marks/batch', restrictTo('Faculty'), async (req, res) => {
  try {
    const { marksData } = req.body;

    if (!Array.isArray(marksData) || marksData.length === 0) {
      return res.status(400).json({ success: false, message: 'marksData array is required.' });
    }

    const results = [];

    for (const row of marksData) {
      const { studentId, subject, ca1, ca2, ca3, midterm, endterm } = row;

      let student = await Student.findOne({ studentId });
      if (!student && /^[0-9a-fA-F]{24}$/.test(String(studentId))) {
        student = await Student.findById(studentId);
      }

      if (!student) {
        results.push({ studentId, success: false, message: 'Not found' });
        continue;
      }

      const subjectName = subject || 'General';
      const idx = student.marks.findIndex((m) => m.subject === subjectName);
      const nextMarks = {
        subject: subjectName,
        ca1: Number(ca1) || 0,
        ca2: Number(ca2) || 0,
        ca3: Number(ca3) || 0,
        midterm: Number(midterm) || 0,
        endterm: Number(endterm) || 0,
      };

      if (idx >= 0) {
        student.marks[idx] = nextMarks;
      } else {
        student.marks.push(nextMarks);
      }

      await student.save();
      emitLowAttendanceAlert(student);
      results.push({ studentId: student.studentId, success: true });
    }

    res.status(200).json({ success: true, results });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/students/:id (Faculty only)
router.delete('/:id', restrictTo('Faculty'), async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });
    res.status(200).json({ success: true, message: 'Student deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
