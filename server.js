const express = require('express');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();

app.use(cors());

const mongoURI = process.env.MONGO_URI || "mongodb+srv://pritul:defcon2020@cluster0.9jwhd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log("MongoDB connected");
}).catch(err => {
  console.error("MongoDB connection error:", err);
});

// Define the schema for a question
const questionSchema = new mongoose.Schema({
  title: String,
  type: String,
  anagramType: String,
  blocks: Array,
  siblingId: mongoose.Schema.Types.ObjectId,
  solution: String,
  options: Array,
});

// Create a model for the question schema
const Question = mongoose.model('Question', questionSchema);

// Create an index on the title field to speed up search queries
questionSchema.index({ title: 1 });

const BATCH_SIZE = 1000; // Batch size for inserting data

async function loadDataFromJson() {
  const filePath = path.join(__dirname, 'speakx_questions.json');
  
  // Read the JSON file asynchronously
  fs.readFile(filePath, 'utf8', async (err, data) => {
    if (err) {
      console.error("Error reading JSON file:", err);
      return;
    }
    
    try {
      const questions = JSON.parse(data); // Parse the JSON data

      // Insert data in batches
      for (let i = 0; i < questions.length; i += BATCH_SIZE) {
        const batch = questions.slice(i, i + BATCH_SIZE).map(question => {
          if (question._id) {
            question._id = new ObjectId(question._id.$oid);
          }
          if (question.siblingId) {
            question.siblingId = new ObjectId(question.siblingId.$oid);
          }
          return question;
        });

        // Insert the batch into MongoDB
        await Question.insertMany(batch);
        console.log(`Inserted ${batch.length} questions into MongoDB.`);
      }
    } catch (e) {
      console.error("Error inserting data into MongoDB:", e);
    }
  });
}

loadDataFromJson();

// Search endpoint with title filtering and pagination using range queries
app.get('/search', async (req, res) => {
  const { title, lastId, per_page = 10 } = req.query;

  if (!title) {
    return res.status(400).json({ message: "Query parameter 'title' is required" });
  }

  try {
    let query = { title: { $regex: title, $options: 'i' } };
    if (lastId) {
      query._id = { $gt: new ObjectId(lastId) }; // Query after the last seen _id
    }

    const questions = await Question.find(query)
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

// Get all questions with pagination
app.get('/questions', async (req, res) => {
  const { page = 1, per_page = 10 } = req.query;

  try {
    const skip = (page - 1) * per_page;
    const questions = await Question.find().skip(skip).limit(parseInt(per_page));

    if (questions.length > 0) {
      return res.status(200).json(questions);
    } else {
      return res.status(404).json({ message: "No more questions found" });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
