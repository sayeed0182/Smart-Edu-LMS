// routes/attendanceRoutes.js
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

// POST /api/attendance/verify-qr
router.post('/verify-qr', async (req, res) => {
  try {
    const { qrData, studentMongoId } = req.body;

    let session;
    try {
      session = typeof qrData === 'string' ? JSON.parse(qrData) : qrData;
    } catch {
      return res.status(400).json({ success: false, message: 'Invalid QR code format.' });
    }

    const { sessionId, subject, date, expiresAt } = session;

    if (!sessionId || !subject || !date) {
      return res.status(400).json({ success: false, message: 'QR data is missing required fields (sessionId, subject, date).' });
    }

    if (expiresAt && new Date() > new Date(expiresAt)) {
      return res.status(400).json({ success: false, message: 'QR code has expired. Please ask your faculty to generate a new one.' });
    }

    let targetStudentId = studentMongoId;
    if (req.user.role === 'Student') {
      const myProfile = await Student.findOne({ userId: req.user._id });
      if (!myProfile) {
        return res.status(404).json({ success: false, message: 'Student profile not found for your account.' });
      }
      targetStudentId = myProfile._id;
    }

    const student = await Student.findById(targetStudentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    const alreadyMarked = student.attendanceRecords.some((r) => r.sessionId === sessionId);
    if (alreadyMarked) {
      return res.status(409).json({ success: false, message: 'Attendance already marked for this session.' });
    }

    student.attendanceRecords.push({
      sessionId,
      subject,
      date: new Date(date),
      status: 'Present',
      markedViaQR: true,
      timestamp: new Date(),
    });

    student.recalculateAttendance();
    await student.save();
    emitLowAttendanceAlert(student);

    res.status(200).json({
      success: true,
      message: `Attendance marked successfully for ${student.name} in ${subject}.`,
      data: {
        studentName: student.name,
        subject,
        date,
        attendancePercentage: student.attendancePercentage,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/attendance/:studentId
router.get('/:studentId', async (req, res) => {
  try {
    const student = await Student.findById(req.params.studentId).select(
      'name studentId userId attendanceRecords attendancePercentage'
    );

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    if (req.user.role === 'Student' && student.userId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    let records = student.attendanceRecords;
    if (req.query.subject) {
      records = records.filter((r) => r.subject === req.query.subject);
    }

    res.status(200).json({
      success: true,
      data: {
        studentName: student.name,
        studentId: student.studentId,
        attendancePercentage: student.attendancePercentage,
        totalClasses: records.length,
        present: records.filter((r) => r.status === 'Present' || r.status === 'Late').length,
        records,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/attendance/generate-session (Faculty only)
router.post('/generate-session', restrictTo('Faculty'), async (req, res) => {
  try {
    const { subject, durationMinutes = 10 } = req.body;

    if (!subject) {
      return res.status(400).json({ success: false, message: 'Subject is required.' });
    }

    const sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationMinutes * 60 * 1000);

    const sessionPayload = {
      sessionId,
      subject,
      date: now.toISOString(),
      facultyId: req.user._id,
      expiresAt: expiresAt.toISOString(),
    };

    res.status(200).json({
      success: true,
      message: `QR session created for ${subject}. Expires in ${durationMinutes} minutes.`,
      data: {
        qrData: JSON.stringify(sessionPayload),
        sessionId,
        expiresAt: expiresAt.toISOString(),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

