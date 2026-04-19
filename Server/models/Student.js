// models/Student.js  — Fixed version
// Change: added ca3 field (max 20) to subjectMarksSchema to match frontend calcTotal()

const mongoose = require('mongoose');

const subjectMarksSchema = new mongoose.Schema(
  {
    subject: { type: String, required: true, trim: true },
    ca1:     { type: Number, min: 0, max: 20, default: 0 },
    ca2:     { type: Number, min: 0, max: 20, default: 0 },
    ca3:     { type: Number, min: 0, max: 20, default: 0 }, // ✅ FIX: was missing, frontend calcTotal uses ca3
    midterm: { type: Number, min: 0, max: 50, default: 0 },
    endterm: { type: Number, min: 0, max: 100, default: 0 }, // ✅ FIX: was max:50 but frontend header says (Max 100)
  },
  { _id: false }
);

const attendanceRecordSchema = new mongoose.Schema(
  {
    sessionId:   { type: String, required: true },
    subject:     { type: String, required: true, trim: true },
    date:        { type: Date,   required: true },
    status:      { type: String, enum: ['Present', 'Absent', 'Late'], default: 'Present' },
    markedViaQR: { type: Boolean, default: false },
    timestamp:   { type: Date,   default: Date.now },
  },
  { _id: false }
);

const studentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Student name is required'],
      trim: true,
    },
    studentId: {
      type: String,
      required: [true, 'Student ID is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
    },
    semester: {
      type: Number,
      min: 1,
      max: 8,
    },
    batch: {
      type: String,
      trim: true,
    },
    attendancePercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    attendanceRecords: [attendanceRecordSchema],
    marks: [subjectMarksSchema],
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

studentSchema.virtual('subjectTotals').get(function () {
  return this.marks.map((m) => ({
    subject: m.subject,
    // ✅ FIX: includes ca3 in total
    total:   m.ca1 + m.ca2 + m.ca3 + m.midterm + m.endterm,
    grade:   calculateGrade(m.ca1 + m.ca2 + m.ca3 + m.midterm + m.endterm),
  }));
});

function calculateGrade(total) {
  if (total >= 90) return 'A+';
  if (total >= 80) return 'A';
  if (total >= 70) return 'B+';
  if (total >= 60) return 'B';
  if (total >= 50) return 'C';
  if (total >= 40) return 'D';
  return 'F';
}

studentSchema.methods.recalculateAttendance = function () {
  const records = this.attendanceRecords;
  if (records.length === 0) { this.attendancePercentage = 0; return; }
  const present = records.filter((r) => r.status === 'Present' || r.status === 'Late').length;
  this.attendancePercentage = Math.round((present / records.length) * 100);
};

const Student = mongoose.model('Student', studentSchema);
module.exports = Student;