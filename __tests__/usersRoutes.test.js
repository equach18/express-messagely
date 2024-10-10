const request = require("supertest");
const jwt = require("jsonwebtoken");

const app = require("../app");
const db = require("../db");
const User = require("../models/user");
const Message = require("../models/message");
const { SECRET_KEY } = require("../config");

describe("Users Routes Test", function () {
  let testUserToken;
  beforeEach(async function () {
    await db.query("DELETE FROM messages");
    await db.query("DELETE FROM users");

    let u1 = await User.register({
      username: "test1",
      password: "password",
      first_name: "Test1",
      last_name: "Testy1",
      phone: "+14155550000",
    });
    testUserToken = jwt.sign({ username: "test1" }, SECRET_KEY);
  });

  /** GET /users => {users:[..]}  */

  describe("GET /users", function () {
    test("can return a list of users", async function () {
      let response = await request(app).get("/users").send({
        _token: testUserToken,
      });

      expect(response.body).toEqual({
        users: [
          {
            username: "test1",
            first_name: "Test1",
            last_name: "Testy1",
            phone: "+14155550000",
          },
        ],
      });
      expect(response.statusCode).toBe(200);
    });

    test("401 if no token is provided", async () => {
      const response = await request(app).get("/users");
      expect(response.statusCode).toBe(401);
    });

    test("401 if incorrect token is provided", async () => {
      let response = await request(app).get("/users").send({
        _token: "6546rgttgdgfggdg",
      });
      expect(response.statusCode).toBe(401);
    });
  });

  /** GET /users/:username => {user: {username, first_name, last_name, phone, join_at, last_login_at}}  */
  describe("GET /:username", () => {
    test("gets user detail", async () => {
      let response = await request(app)
        .get("/users/test1")
        .send({ _token: testUserToken });
      expect(response.body).toEqual({
        user: {
          username: "test1",
          first_name: "Test1",
          last_name: "Testy1",
          phone: "+14155550000",
          join_at: expect.any(String),
          last_login_at: expect.any(String),
        },
      });
    });

    test("401 if username does not exist", async () => {
      let response = await request(app)
        .get("/users/fake_username")
        .send({ _token: testUserToken });
      expect(response.statusCode).toBe(401);
    });
  });
});

describe("Test User Messages Routes", () => {
  let testUserToken;
  beforeEach(async () => {
    await db.query("DELETE FROM messages");
    await db.query("DELETE FROM users");

    let u1 = await User.register({
      username: "test1",
      password: "password",
      first_name: "Test1",
      last_name: "Testy1",
      phone: "+14155550000",
    });
    let u2 = await User.register({
      username: "test2",
      password: "password2",
      first_name: "Test2",
      last_name: "Testy2",
      phone: "+14155550001",
    });
    let m1 = await Message.create({
      from_username: "test1",
      to_username: "test2",
      body: "from test1 to test2",
    });
    let m2 = await Message.create({
      from_username: "test2",
      to_username: "test1",
      body: "from test2 to test1",
    });
    testUserToken = jwt.sign({ username: "test1" }, SECRET_KEY);
  });

  /** GET /:username/to - get messages to user
   *
   * => {messages: [{id,
   *                 body,
   *                 sent_at,
   *                 read_at,
   *                 from_user: {username, first_name, last_name, phone}}, ...]} */
  describe("GET /users/:username/to", () => {
    test("can get messages to the user", async () => {
      let response = await request(app)
        .get("/users/test1/to")
        .send({ _token: testUserToken });

      expect(response.body).toEqual({
        messages: [
          {
            id: expect.any(Number),
            body: "from test2 to test1",
            sent_at: expect.any(String),
            read_at: null,
            from_user: {
              username: "test2",
              first_name: "Test2",
              last_name: "Testy2",
              phone: "+14155550001",
            },
          },
        ],
      });
      expect(response.statusCode).toBe(200);
    });

    test("401 when a user is trying to see the messages of another user", async () => {
      let response = await request(app)
        .get("/users/test2/to")
        .send({ _token: testUserToken });
      expect(response.statusCode).toBe(401);
    });

    test("401 when a user is trying to see the messages of a non-existent user", async () => {
      let response = await request(app)
        .get("/users/imfake/to")
        .send({ _token: testUserToken });
      expect(response.statusCode).toBe(401);
    });

    test("401 on wrong authorization", async () => {
      let response = await request(app)
        .get("/users/test1/to")
        .send({ _token: "djhbfgjhbdfgjhd" });
      expect(response.statusCode).toBe(401);
    });
  });

  /** GET /:username/from - get messages from user
 *
 * => {messages: [{id,
 *                 body,
 *                 sent_at,
 *                 read_at,
 *                 to_user: {username, first_name, last_name, phone}}, ...]}
 *
 **/
  describe("GET /users/:username/from", () => {
    test("can get messages from user", async () => {
      let response = await request(app)
        .get("/users/test1/from")
        .send({ _token: testUserToken });

      expect(response.body).toEqual({
        messages: [
          {
            id: expect.any(Number),
            body: "from test1 to test2",
            sent_at: expect.any(String),
            read_at: null,
            to_user: {
              username: "test2",
              first_name: "Test2",
              last_name: "Testy2",
              phone: "+14155550001",
            },
          },
        ],
      });
      expect(response.statusCode).toBe(200);
    });

    test("401 when a user is trying to see the messages of another user", async () => {
      let response = await request(app)
        .get("/users/test2/from")
        .send({ _token: testUserToken });
      expect(response.statusCode).toBe(401);
    });

    test("401 when a user is trying to see the messages of a non-existent user", async () => {
      let response = await request(app)
        .get("/users/imfake/from")
        .send({ _token: testUserToken });
      expect(response.statusCode).toBe(401);
    });

    test("401 on wrong authorization", async () => {
      let response = await request(app)
        .get("/users/test1/from")
        .send({ _token: "djhbfgjhbdfgjhd" });
      expect(response.statusCode).toBe(401);
    });
  });
});

afterAll(async function () {
  await db.end();
});
