import React from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const MarksheetPDF = ({ student }) => {
  const handleDownload = () => {
    if (!student) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('EduSmart University', 14, 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(`Student Name: ${student.name}`, 14, 28);
    doc.text(`Student ID: ${student.id}`, 14, 35);
    doc.text(`Semester: ${student.semester}`, 14, 42);

    let startY = 50;

    (student.results || []).forEach((result, index) => {
      if (index > 0) {
        startY = (doc.lastAutoTable?.finalY || startY) + 12;
      }

      if (startY > 250) {
        doc.addPage();
        startY = 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text(`${result.sem}`, 14, startY);

      autoTable(doc, {
        startY: startY + 4,
        head: [['Subject', 'Credits', 'Marks', 'Grade']],
        body: (result.subjects || []).map((subject) => [
          subject.name,
          String(subject.credits ?? ''),
          String(subject.marks ?? ''),
          subject.grade ?? '',
        ]),
        foot: [['', '', 'GPA', String(result.gpa ?? '')]],
        styles: {
          fontSize: 10,
          cellPadding: 2.5,
        },
        headStyles: {
          fillColor: [79, 70, 229],
        },
        footStyles: {
          fillColor: [241, 245, 249],
          textColor: [15, 23, 42],
          fontStyle: 'bold',
        },
      });

      startY = (doc.lastAutoTable?.finalY || startY) + 6;
    });

    const totalPages = doc.internal.getNumberOfPages();
    for (let page = 1; page <= totalPages; page += 1) {
      doc.setPage(page);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Page ${page} of ${totalPages}`, pageWidth - 14, 287, { align: 'right' });
    }

    doc.save(`marksheet-${student.id}.pdf`);
  };

  return (
    <button
      type="button"
      onClick={handleDownload}
      className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-xs font-black"
    >
      Download
    </button>
  );
};

export default MarksheetPDF;

