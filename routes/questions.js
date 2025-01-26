const express = require('express');
const fs = require('fs');
const path = require('path');
const { ObjectId } = require('mongodb');
const Question = require('../models/Question');

const router = express.Router();

router.post('/load-data', async (req, res) => {
  const filePath = path.join(__dirname, '../data/speakx_questions.json');

  fs.readFile(filePath, 'utf8', async (err, data) => {
    if (err) return res.status(500).json({ message: "Error reading JSON file", error: err });

    try {
      const questions = JSON.parse(data);

      const formattedQuestions = questions.map(question => {
        if (question._id) question._id = new ObjectId(question._id.$oid);
        if (question.siblingId) question.siblingId = new ObjectId(question.siblingId.$oid);
        return question;
      });

      await Question.insertMany(formattedQuestions);
      res.status(200).json({ message: `Inserted ${formattedQuestions.length} questions.` });
    } catch (e) {
      res.status(500).json({ message: "Error inserting data", error: e });
    }
  });
});

// Search questions by title
router.get('/search', async (req, res) => {
  const { title, page = 1, per_page = 10 } = req.query;

  if (!title) return res.status(400).json({ message: "Query parameter 'title' is required" });

  try {
    const skip = (page - 1) * per_page;
    const questions = await Question.find({ title: { $regex: title, $options: 'i' } })
                                    .skip(skip)
                                    .limit(parseInt(per_page));

    res.status(questions.length ? 200 : 404).json(questions.length ? questions : { message: "No results found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Paginate all questions
router.get('/questions', async (req, res) => {
  const { page = 1, per_page = 10 } = req.query;

  try {
    const skip = (page - 1) * per_page;
    const questions = await Question.find().skip(skip).limit(parseInt(per_page));

    res.status(questions.length ? 200 : 404).json(questions.length ? questions : { message: "No more questions found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
