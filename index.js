const express = require("express");
const redis = require("redis");
const axios = require("axios");

const PORT = process.env.PORT || 5000;
const REDIS_PORT = process.env.REDIS_PORT || 6379;

let client;

(async () => {
  client = redis.createClient();

  client.on("error", (err) => console.log("Redis Client Error", err));

  await client.connect();
})();

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
    const repos = response.data.public_repos;

    // Set data in redis
    await client.set(username, repos);

    res.send(setResponse(username, repos));
  } catch (err) {
    console.log("Oops!! Error==>", err);
    res.status(500);
  }
};

// Cache middleware
const cache = async (req, res, next) => {
  const { username } = req.params;

  const data = await client.get(username);

  if (data !== null) {
    res.send(setResponse(username, data));
  }
  next();
};

app.get("/repos/:username", cache, getRepos);
// It limits the lots of request by caching the data as we used cache middleware for it

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
