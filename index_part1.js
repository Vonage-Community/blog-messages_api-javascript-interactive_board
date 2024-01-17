require('dotenv').config(); // loads environment variables
const express = require("express");

const Airtable = require("airtable");
const base = new Airtable({ apiKey: process.env.AIRTABLE_ACCESS_TOKEN }).base(
  process.env.AIRTABLE_BASE
);

const app = require("express")();
const path = require("path");

// after you define your app, but before app.listen
app.use(express.static(path.join(__dirname, "public")));

app.use(express.json()); //Used to parse JSON bodies
app.use(express.urlencoded({ extended: false }));

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*"); // replace "*" with your domain for production
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

const fs = require("fs");
let blocklist = fs.readFileSync("blocklist.txt", "utf8").split(/\s+/);

app.post("/inbound", (req, res) => {
  const { from, text, channel, message_type } = req.body;
  console.log(JSON.stringify(req.body));
  let imageUrl = "";
  if (
    (channel === "whatsapp" || channel === "mms") &&
    message_type === "image"
  ) {
    imageUrl = req.body.image.url;
  }

  base("Messages")
    .select({
      filterByFormula: `Number=${from}`,
    })
    .eachPage((records) => {
      if (records.length == 0) {
        createUser(text, req.body.from, imageUrl);
      } else {
        createMessage(text, records[0].fields.Number[0], imageUrl);
      }
    });

  function createUser(message, from, imageUrl) {
    base("Numbers").create(
      {
        Number: from,
      },
      (err, record) => {
        if (err) {
          console.error(err);
          return;
        }
        createMessage(message, record.getId(), imageUrl);
      }
    );
  }

  function createMessage(message, numberId, imageUrl) {
    let status = "Pending";
    if (message) {
      if (
        blocklist.some((word) =>
          message.toLowerCase().includes(word.toLowerCase())
        )
      ) {
        status = "Rejected";
      }
    }
    base("Messages").create(
      {
        Message: message,
        Number: [numberId],
        Status: status,
        ImageUrl: imageUrl,
      },
      (err) => {
        if (err) {
          console.error(err);
          return;
        }
        console.log("Message saved to Airtable");
        res.status(200).end();
      }
    );
  }
});

app.post("/messages/:messageId/:status", (req, res) => {
  let messageId = req.params.messageId; // Need validation to check if the message id exist
  let status = req.params.status; // Need validation to check if it's Accepted / Rejected

  base("Messages").update(
    messageId,
    {
      Status: status,
    },
    function (err, record) {
      if (err) {
        console.error(err);
        return;
      }
      console.log(record.get("id"));
      res.status(200).end();
    }
  );
});

app.get("/messages", (req, res) => {
  console.log("Messages");
  let statusFilterValue = req.query.status;
  console.log(statusFilterValue);
  let filteredRecords = [];
  base("Messages")
    .select({
      view: "Grid view",
      filterByFormula: `Status="${statusFilterValue}"`,
    })
    .eachPage(
      function page(records, fetchNextPage) {
        // This function (`page`) will get called for each page of records.
        records.forEach(function (record) {
          filteredRecords.push(record); // Push each record into the allRecords array
        });

        // To fetch the next page of records, call `fetchNextPage`.
        fetchNextPage();
      },
      function done(err) {
        if (err) {
          console.error(err);
          return;
        }

        console.log(filteredRecords); // At this point, allRecords array will have all the records.
        res.send(filteredRecords);
      }
    );
});

app.listen(3001, () => {
  console.log(`Example app listening on port ${3001}`);
});
