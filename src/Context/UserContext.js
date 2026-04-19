import React, { createContext, useContext, useState, useCallback } from 'react';

export const UserContext = createContext(null);

const STUDENT_DATA = {
  name: 'Alex Johnson',
  id: 'STU-88291',
  attendance: 84,
  major: 'Computer Science',
  semester: '4th Semester',
  feeAmount: 112000,
  attendanceTrend: [
    { month: 'Aug', attendance: 78 },
    { month: 'Sep', attendance: 82 },
    { month: 'Oct', attendance: 80 },
    { month: 'Nov', attendance: 88 },
    { month: 'Dec', attendance: 84 },
    { month: 'Jan', attendance: 91 },
  ],
  gradeDistribution: [
    { name: 'A', value: 4, color: '#6366f1' },
    { name: 'A-', value: 2, color: '#818cf8' },
    { name: 'B+', value: 2, color: '#a5b4fc' },
    { name: 'B', value: 1, color: '#c7d2fe' },
  ],
  results: [
    {
      sem: 'Semester 1', semNum: 1, year: 'Year 1', yearNum: 1,
      gpa: '9.2', status: 'Pass',
      subjects: [
        { name: 'Mathematics I',                grade: 'O',  credits: 4, marks: 92, gradePoint: 10 },
        { name: 'Introduction to Programming',  grade: 'A+', credits: 3, marks: 88, gradePoint: 9  },
        { name: 'Physics',                      grade: 'A',  credits: 4, marks: 82, gradePoint: 8  },
        { name: 'Engineering Drawing',          grade: 'A+', credits: 2, marks: 87, gradePoint: 9  },
        { name: 'Communication Skills',         grade: 'O',  credits: 2, marks: 91, gradePoint: 10 },
      ],
    },
    {
      sem: 'Semester 2', semNum: 2, year: 'Year 1', yearNum: 1,
      gpa: '9.5', status: 'Pass',
      subjects: [
        { name: 'Mathematics II',               grade: 'O',  credits: 4, marks: 90, gradePoint: 10 },
        { name: 'Data Structures',              grade: 'O',  credits: 4, marks: 94, gradePoint: 10 },
        { name: 'Digital Logic',                grade: 'A+', credits: 3, marks: 87, gradePoint: 9  },
        { name: 'Electronics Fundamentals',     grade: 'A',  credits: 3, marks: 83, gradePoint: 8  },
        { name: 'Environmental Science',        grade: 'A+', credits: 2, marks: 89, gradePoint: 9  },
      ],
    },
    {
      sem: 'Semester 3', semNum: 3, year: 'Year 2', yearNum: 2,
      gpa: '8.8', status: 'Pass',
      subjects: [
        { name: 'Algorithms',                   grade: 'A',  credits: 4, marks: 85, gradePoint: 9  },
        { name: 'Database Management',          grade: 'A+', credits: 4, marks: 88, gradePoint: 9  },
        { name: 'Operating Systems',            grade: 'B+', credits: 3, marks: 78, gradePoint: 8  },
        { name: 'Discrete Mathematics',         grade: 'A',  credits: 3, marks: 84, gradePoint: 9  },
        { name: 'Object Oriented Programming',  grade: 'A+', credits: 3, marks: 87, gradePoint: 9  },
      ],
    },
    {
      sem: 'Semester 4', semNum: 4, year: 'Year 2', yearNum: 2,
      gpa: '-', status: 'Ongoing',
      subjects: [
        { name: 'Computer Networks',            grade: '-', credits: 4, marks: '-', gradePoint: '-' },
        { name: 'Software Engineering',         grade: '-', credits: 3, marks: '-', gradePoint: '-' },
        { name: 'Theory of Computation',        grade: '-', credits: 4, marks: '-', gradePoint: '-' },
        { name: 'Java Programming',             grade: '-', credits: 3, marks: '-', gradePoint: '-' },
        { name: 'Microprocessors',              grade: '-', credits: 3, marks: '-', gradePoint: '-' },
      ],
    },
    { sem: 'Semester 5', semNum: 5, year: 'Year 3', yearNum: 3, gpa: '-', status: 'Locked', subjects: [] },
    { sem: 'Semester 6', semNum: 6, year: 'Year 3', yearNum: 3, gpa: '-', status: 'Locked', subjects: [] },
    { sem: 'Semester 7', semNum: 7, year: 'Year 4', yearNum: 4, gpa: '-', status: 'Locked', subjects: [] },
    { sem: 'Semester 8', semNum: 8, year: 'Year 4', yearNum: 4, gpa: '-', status: 'Locked', subjects: [] },
  ],

  assessments: [
    { id: 1, name: 'Quiz 1', subject: 'Data Structures', status: 'Completed', score: '18/20', date: 'Jan 15, 2026' },
    { id: 2, name: 'Quiz 2', subject: 'Algorithms', status: 'Pending', score: '-', date: 'Feb 10, 2026' },
  ],
};

const FACULTY_DATA = {
  name: 'Dr. Sarah Williams',
  id: 'FAC-1029',
  department: 'CSE Department',
  managedStudents: [
    { id: 'S001', name: 'John Doe', email: 'john@uni.edu', attendance: '88%', performance: 'Excellent' },
    { id: 'S002', name: 'Jane Smith', email: 'jane@uni.edu', attendance: '92%', performance: 'Good' },
    { id: 'S003', name: 'Mike Ross', email: 'mike@uni.edu', attendance: '74%', performance: 'Average' },
    { id: 'S004', name: 'Rachel Zane', email: 'rachel@uni.edu', attendance: '98%', performance: 'Excellent' },
    { id: 'S005', name: 'Harvey Specter', email: 'harvey@uni.edu', attendance: '85%', performance: 'Excellent' },
    { id: 'S006', name: 'Louis Litt', email: 'louis@uni.edu', attendance: '99%', performance: 'Good' },
    { id: 'S007', name: 'Donna Paulsen', email: 'donna@uni.edu', attendance: '100%', performance: 'Excellent' },
    { id: 'S008', name: 'Jessica Pearson', email: 'jessica@uni.edu', attendance: '95%', performance: 'Excellent' },
    { id: 'S009', name: 'Robert Zane', email: 'robert@uni.edu', attendance: '82%', performance: 'Average' },
  ],
  syllabusTracking: [
    { subject: 'Human Computer Interaction', completed: 85, totalModules: 5 },
    { subject: 'Data Structures & Algorithms', completed: 60, totalModules: 8 },
    { subject: 'AI & Machine Learning', completed: 40, totalModules: 10 },
  ],
  marksData: [
    { id: 'S001', name: 'John Doe', ca1: 18, ca2: 20, ca3: 17, midterm: 45, endterm: 88 },
    { id: 'S002', name: 'Jane Smith', ca1: 19, ca2: 18, ca3: 20, midterm: 48, endterm: 90 },
    { id: 'S003', name: 'Mike Ross', ca1: 15, ca2: 16, ca3: 14, midterm: 38, endterm: 75 },
    { id: 'S004', name: 'Rachel Zane', ca1: 20, ca2: 20, ca3: 19, midterm: 50, endterm: 95 },
  ],
  attendanceTrend: [
    { month: 'Aug', avg: 82 },
    { month: 'Sep', avg: 87 },
    { month: 'Oct', avg: 85 },
    { month: 'Nov', avg: 91 },
    { month: 'Dec', avg: 88 },
    { month: 'Jan', avg: 93 },
  ],
};

const STORAGE_TOKEN_KEY = 'edusmartToken';
const STORAGE_USER_KEY = 'edusmartUser';

const readStoredUser = () => {
  try {
    const raw = localStorage.getItem(STORAGE_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const UserProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(readStoredUser);
  const [marksData, setMarksData] = useState(FACULTY_DATA.marksData);

  const userRole = currentUser?.role ?? null;
  const facultyData = { ...FACULTY_DATA, marksData };

  const login = useCallback((userObj) => {
    setCurrentUser(userObj);
    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(userObj));
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    setMarksData(FACULTY_DATA.marksData);
    localStorage.removeItem(STORAGE_TOKEN_KEY);
    localStorage.removeItem(STORAGE_USER_KEY);
  }, []);

  const updateMark = useCallback((studentId, field, value) => {
    setMarksData((prev) =>
      prev.map((s) =>
        s.id === studentId
          ? { ...s, [field]: value === '' ? 0 : parseInt(value, 10) || 0 }
          : s
      )
    );
  }, []);

  const applyImportedMarks = useCallback((rows) => {
    if (!Array.isArray(rows) || rows.length === 0) return;

    setMarksData((prev) => {
      const nextMap = new Map(prev.map((student) => [String(student.id), { ...student }]));

      rows.forEach((row) => {
        const studentId = String(row.studentId || '').trim();
        if (!studentId) return;

        const existing = nextMap.get(studentId) || { id: studentId, name: studentId };
        nextMap.set(studentId, {
          ...existing,
          ca1: Number(row.ca1) || 0,
          ca2: Number(row.ca2) || 0,
          ca3: Number(row.ca3) || 0,
          midterm: Number(row.midterm) || 0,
          endterm: Number(row.endterm) || 0,
        });
      });

      return Array.from(nextMap.values());
    });
  }, []);

  const value = {
    userRole,
    currentUser,
    studentData: STUDENT_DATA,
    facultyData,
    login,
    logout,
    updateMark,
    applyImportedMarks,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used inside <UserProvider>');
  return ctx;
};

