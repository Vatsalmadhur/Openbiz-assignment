const express = require("express");
const cors = require("cors");
const { readFileSync } = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
require("dotenv").config();
const data = require("../scraper/udyam-form-data.json");
const app = express();
app.use(cors());
app.use(express.json());
const prisma = new PrismaClient();
const scrapedData = data;
const aadhaarField = scrapedData.fields.find(
  (f) => f.id === "ctl00_ContentPlaceHolder1_txtadharno"
);
const nameField = scrapedData.fields.find(
  (f) => f.id === "ctl00_ContentPlaceHolder1_txtownername"
);

function validate(data) {
  let errors = {};
  const aadhaar = data.aadhaarNumber || "";
  const name = data.entrepreneurName || "";

  if (!/^\d{12}$/.test(aadhaar)) {
    errors.aadhaarNumber = "Invalid Aadhaar number";
  }
  if (!/^[A-Za-z\s\.]{2,100}$/.test(name)) {
    errors.entrepreneurName = "Invalid name format";
  }

  return errors;
}

app.get('/',(req,res)=>{
res.json({"message":"server is alive"});
});

app.post("/api/udyam/step1", async (req, res) => {
  const errors = validate(req.body);
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ message: "Validation failed", errors });
  }

  const record = await prisma.udyamStep1Submission.create({
    data: {
      aadhaarNumber: req.body.aadhaarNumber,
      entrepreneurName: req.body.entrepreneurName,
      valid: true,
    },
  });

  res.json({ id: record.id, message: "Saved successfully" });
});

app.listen(4000, () => console.log("Server running on port 4000"));
