const mongoose = require('mongoose');

const RecordSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Optional, linking CSV data to a user
    data: { type: mongoose.Schema.Types.Mixed, required: true }, // Store parsed CSV row data
    sourceFile: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Record', RecordSchema, 'records');
