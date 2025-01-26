const express = require('express');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
app.use(cors());

// MongoDB connection
const mongoURI = process.env.MONGO_URI || "mongodb+srv://pritul:defcon2020@cluster0.9jwhd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

mongoose
  .connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("MongoDB connected");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });

// Define the schema and model
const questionSchema = new mongoose.Schema({
  title: String,
  type: String,
  anagramType: String,
  blocks: Array,
  siblingId: mongoose.Schema.Types.ObjectId,
  solution: String,
  options: Array,
});

const Question = mongoose.model('Question', questionSchema);

// Function to load data from JSON file
async function loadDataFromJson() {
  const filePath = path.resolve(__dirname, 'speakx_questions.json');

  fs.readFile(filePath, 'utf8', async (err, data) => {
    if (err) {
      console.error("Error reading JSON file:", err);
      return;
    }

    try {
      const questions = JSON.parse(data);

      const formattedQuestions = questions.map((question) => {
        if (question._id) {
          question._id = new ObjectId(question._id.$oid);
        }
        if (question.siblingId) {
          question.siblingId = new ObjectId(question.siblingId.$oid);
        }
        return question;
      });

      await Question.insertMany(formattedQuestions, { ordered: false }).catch(err => {
        console.error("Error inserting data (e.g., duplicate keys):", err.message);
      });

      console.log(`Inserted ${formattedQuestions.length} questions into MongoDB.`);
    } catch (e) {
      console.error("Error parsing or inserting data:", e);
    }
  });
}

loadDataFromJson();

// Endpoint: Search questions by title
app.get('/search', async (req, res) => {
  const { title, page = 1, per_page = 10 } = req.query;

  if (!title) {
    return res.status(400).json({ message: "Query parameter 'title' is required" });
  }

  try {
    const skip = (Math.max(1, parseInt(page)) - 1) * Math.min(100, parseInt(per_page));
    const questions = await Question.find({ title: { $regex: title, $options: 'i' } })
      .lean()
      .skip(skip)
      .limit(parseInt(per_page));

    if (questions.length > 0) {
      return res.status(200).json(questions);
    } else {
      return res.status(404).json({ message: "No results found" });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Endpoint: Get paginated questions
app.get('/questions', async (req, res) => {
  const { page = 1, per_page = 10 } = req.query;

  try {
    const skip = (Math.max(1, parseInt(page)) - 1) * Math.min(100, parseInt(per_page));
    const questions = await Question.find().lean().skip(skip).limit(parseInt(per_page));

    if (questions.length > 0) {
      return res.status(200).json(questions);
    } else {
      return res.status(404).json({ message: "No more questions found" });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.disconnect();
  console.log("MongoDB disconnected");
  process.exit(0);
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
