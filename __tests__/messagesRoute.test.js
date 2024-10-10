const request = require("supertest");
const jwt = require("jsonwebtoken");

const app = require("../app");
const db = require("../db");
const User = require("../models/user");
const Message = require("../models/message");
const { SECRET_KEY } = require("../config");

describe("Tests Messages Routes", () => {
  let testUserToken;
  let msg1;
  let msg2;
  let msg3;
  beforeEach(async () => {
    await db.query("DELETE FROM messages");
    await db.query("DELETE FROM users");

    await User.register({
      username: "test1",
      password: "password",
      first_name: "Test1",
      last_name: "Testy1",
      phone: "+14155550000",
    });
    await User.register({
      username: "test2",
      password: "password2",
      first_name: "Test2",
      last_name: "Testy2",
      phone: "+14155550001",
    });
    await User.register({
      username: "test3",
      password: "password3",
      first_name: "Test3",
      last_name: "Testy3",
      phone: "+14155550002",
    });
    msg1 = await Message.create({
      from_username: "test1",
      to_username: "test2",
      body: "from test1 to test2",
    });
    msg2 = await Message.create({
      from_username: "test2",
      to_username: "test1",
      body: "from test2 to test1",
    });
    msg3 = await Message.create({
      from_username: "test3",
      to_username: "test2",
      body: "from test3 to test2",
    });
    testUserToken = jwt.sign({ username: "test1" }, SECRET_KEY);
  });
  /** GET /:id - get detail of message.
   *
   * => {message: {id,
   *               body,
   *               sent_at,
   *               read_at,
   *               from_user: {username, first_name, last_name, phone},
   *               to_user: {username, first_name, last_name, phone}}
   *
   * Make sure that the currently-logged-in users is either the to or from user.
   *
   **/
  describe("GET /messages/:id", function () {
    test("can get message from user", async function () {
      let response = await request(app)
        .get(`/messages/${msg1.id}`)
        .send({ _token: testUserToken });
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({
        message: {
          id: expect.any(Number),
          body: "from test1 to test2",
          sent_at: expect.any(String),
          read_at: null,
          from_user: {
            username: "test1",
            first_name: "Test1",
            last_name: "Testy1",
            phone: "+14155550000",
          },
          to_user: {
            username: "test2",
            first_name: "Test2",
            last_name: "Testy2",
            phone: "+14155550001",
          },
        },
      });
    });
    test("can get message to user", async function () {
      let response = await request(app)
        .get(`/messages/${msg2.id}`)
        .send({ _token: testUserToken });

      expect(response.statusCode).toBe(200);

      expect(response.body).toEqual({
        message: {
          id: expect.any(Number),
          body: "from test2 to test1",
          sent_at: expect.any(String),
          read_at: null,
          to_user: {
            username: "test1",
            first_name: "Test1",
            last_name: "Testy1",
            phone: "+14155550000",
          },
          from_user: {
            username: "test2",
            first_name: "Test2",
            last_name: "Testy2",
            phone: "+14155550001",
          },
        },
      });
    });

    test("401 when trying to view messages that do not belong to the user", async function () {
      let response = await request(app)
        .get(`/messages/${msg3.id}`)
        .send({ _token: testUserToken });

      expect(response.statusCode).toEqual(401);
    });

    test("401 when trying to view messages that do not exist", async function () {
      let response = await request(app)
        .get("/messages/9876")
        .send({ _token: testUserToken });

      expect(response.statusCode).toEqual(404);
    });
  });
  /** POST / - post message.
   *
   * {to_username, body} =>
   *   {message: {id, from_username, to_username, body, sent_at}}
   *
   **/
  describe("POST / - posts message", () => {
    test("can post message", async () => {
      let response = await request(app).post("/messages/").send({
        to_username: "test3",
        body: "from test1 to test3",
        _token: testUserToken,
      });
      expect(response.statusCode).toBe(201);
      expect(response.body).toEqual({
        message: {
          id: expect.any(Number),
          from_username: "test1",
          to_username: "test3",
          body: "from test1 to test3",
          sent_at: expect.any(String),
        },
      });
    });

    test("401 when posting on incorrect login", async () => {
      let response = await request(app).post("/messages/").send({
        to_username: "test2",
        body: "from test1 to test3",
        _token: "iughdfughkjfdgn",
      });
      expect(response.statusCode).toBe(401);
    });

    test("401 when posting to nonexisting user", async () => {
      let response = await request(app).post("/messages/").send({
        to_username: "test2543",
        body: "some msg",
        _token: testUserToken,
      });
      expect(response.statusCode).toBe(500);
    });
  });

  /** POST/:id/read - mark message as read:
   *
   *  => {message: {id, read_at}}
   *
   * Make sure that the only the intended recipient can mark as read.
   *
   **/
  describe("POST /:id:read", () => {
    test("can mark message as read", async () => {
      let response = await request(app)
        .post(`/messages/${msg2.id}/read`)
        .send({ _token: testUserToken });

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({
        message: {
          id: msg2.id,
          read_at: expect.any(String)
        }
      })
    });
    test("401 when trying to mark another user's msg as read", async () => {
      let response = await request(app)
        .post(`/messages/${msg3.id}/read`)
        .send({ _token: testUserToken });

      expect(response.statusCode).toBe(401);

    });
    test("404 when trying to mark nonexisting msg as read", async () => {
      let response = await request(app)
        .post("/messages/5546546/read")
        .send({ _token: testUserToken });

      expect(response.statusCode).toBe(404);

    });

  });
});

afterAll(async function () {
  await db.end();
});
