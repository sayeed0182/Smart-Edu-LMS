// models/SyllabusMaterial.js
const mongoose = require('mongoose');

const SyllabusMaterialSchema = new mongoose.Schema(
  {
    subjectCode:  { type: String, required: true, trim: true },
    subjectName:  { type: String, trim: true },
    filename:     { type: String, required: true },      // stored filename on disk
    originalName: { type: String, required: true },      // original upload name
    uploader:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    uploaderName: { type: String },
    filePath:     { type: String, required: true },
    fileSize:     { type: Number },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SyllabusMaterial', SyllabusMaterialSchema);
