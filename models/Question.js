const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  title: String,
  type: String,
  anagramType: String,
  blocks: Array,
  siblingId: mongoose.Schema.Types.ObjectId,
  solution: String,
  options: Array,
});

module.exports = mongoose.model('Question', questionSchema);
