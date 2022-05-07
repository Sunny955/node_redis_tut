const express = require("express");
// const fetch = require("node-fetch");
const redis = require("redis");
const axios = require("axios");

const PORT = process.env.PORT || 5000;
const REDIS_PORT = process.env.REDIS_PORT || 6379;

const client = redis.createClient(REDIS_PORT, {
  legacyMode: true,
});

async function callClient() {
  await client.connect();
}
callClient();

const app = express();
app.use(express.json());

// Set response
const setResponse = (username, repos) => {
  return `<h2>${username} has ${repos} Github repos</h2>`;
};

const getRepos = async (req, res, next) => {
  try {
    console.log("Fetching data.....");

    const { username } = req.params;

    const response = await axios.get(
      `https://api.github.com/users/${username}`
    );
    console.log(response.data);
    const repos = response.data.public_repos;
    // Set data in redis

    client.setex(username, 3600, repos);

    res.send(setResponse(username, repos));
  } catch (err) {
    console.log("Oops!! Error==>", err);
    res.status(500);
  }
};

// Cache middleware

const cache = (req, res, next) => {
  const { username } = req.params;

  client.get(username, (err, data) => {
    if (err) {
      throw err;
    }
    if (data !== null) {
      res.send(setResponse(username, data));
    } else {
      next();
    }
  });
};

app.get("/repos/:username", cache, getRepos);
// It limits the lots of request by caching the data as we used cache middleware for it

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
