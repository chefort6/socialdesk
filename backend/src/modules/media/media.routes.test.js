const { test } = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const supertest = require("supertest");

require("../../test-utils/env");

const mediaService = require("./media.service");
const app = require("../../app");

function tokenFor(role, id = "1") {
  return jwt.sign({ id, role }, process.env.JWT_SECRET);
}

const pngFile = () => Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
]);
const mp4File = () => Buffer.concat([
  Buffer.from([0x00, 0x00, 0x00, 0x18]),
  Buffer.from("ftypisom", "ascii"),
]);

test("POST /api/media rejects requests with no session", async () => {
  const response = await supertest(app)
    .post("/api/media")
    .attach("file", pngFile(), "photo.png");

  assert.equal(response.status, 401);
});

test("POST /api/media uploads and returns upload metadata", async (t) => {
  const uploadMock = t.mock.method(
    mediaService,
    "uploadToCloudinary",
    async () => ({
      secure_url: "https://res.cloudinary.com/demo/user_media/7/composer/x.png",
      public_id: "user_media/7/composer/x",
      resource_type: "image",
    }),
  );
  t.mock.method(mediaService, "destroyFromCloudinary", async () => ({}));

  const response = await supertest(app)
    .post("/api/media")
    .set("Cookie", `auth-token=${tokenFor("user", "7")}`)
    .field("purpose", "composer")
    .attach("file", pngFile(), "photo.png");

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(
    response.body.data.url,
    "https://res.cloudinary.com/demo/user_media/7/composer/x.png",
  );
  assert.equal(response.body.data.publicId, "user_media/7/composer/x");
  assert.equal(response.body.data.resourceType, "image");
  // Namespaced under the authenticated caller's id + whitelisted purpose.
  assert.equal(
    uploadMock.mock.calls[0].arguments[1].folder,
    "user_media/7/composer",
  );
});

test("POST /api/media returns 400 when no file is attached", async () => {
  const response = await supertest(app)
    .post("/api/media")
    .set("Cookie", `auth-token=${tokenFor("user", "7")}`)
    .field("purpose", "composer");

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
});

test("POST /api/media rejects an unsupported file type", async () => {
  const response = await supertest(app)
    .post("/api/media")
    .set("Cookie", `auth-token=${tokenFor("user", "7")}`)
    .attach("file", Buffer.from("not-media"), "notes.txt");

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
});

test("POST /api/media rejects spoofed image content", async () => {
  const response = await supertest(app)
    .post("/api/media")
    .set("Cookie", `auth-token=${tokenFor("user", "7")}`)
    .attach("file", Buffer.from("not really an image"), {
      filename: "photo.png",
      contentType: "image/png",
    });

  assert.equal(response.status, 400);
  assert.match(response.body.error, /contents/i);
});

test("POST /api/media rejects an invalid purpose", async () => {
  const response = await supertest(app)
    .post("/api/media")
    .set("Cookie", `auth-token=${tokenFor("user", "7")}`)
    .field("purpose", "../../another-user")
    .attach("file", pngFile(), "photo.png");

  assert.equal(response.status, 400);
});

test("POST /api/media detects and uploads video content", async (t) => {
  const uploadMock = t.mock.method(mediaService, "uploadToCloudinary", async () => ({
    secure_url: "https://example.test/video.mp4",
    public_id: "user_media/7/general/video",
    resource_type: "video",
  }));

  const response = await supertest(app)
    .post("/api/media")
    .set("Cookie", `auth-token=${tokenFor("user", "7")}`)
    .attach("file", mp4File(), { filename: "video.mp4", contentType: "video/mp4" });

  assert.equal(response.status, 200);
  assert.equal(uploadMock.mock.calls[0].arguments[1].resource_type, "video");
  assert.equal(uploadMock.mock.calls[0].arguments[1].folder, "user_media/7/general");
});

test("POST /api/media rejects a file over the size limit", async () => {
  const tooBig = Buffer.alloc(11 * 1024 * 1024, 1); // 11 MB > 10 MB cap

  const response = await supertest(app)
    .post("/api/media")
    .set("Cookie", `auth-token=${tokenFor("user", "7")}`)
    .attach("file", tooBig, "big.mp4");

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
});

test("POST /api/media returns 500 when the upload service fails", async (t) => {
  t.mock.method(mediaService, "uploadToCloudinary", async () => {
    throw new Error("Cloudinary boom");
  });

  const response = await supertest(app)
    .post("/api/media")
    .set("Cookie", `auth-token=${tokenFor("user", "7")}`)
    .attach("file", pngFile(), "photo.png");

  assert.equal(response.status, 500);
  assert.equal(response.body.success, false);
  assert.equal(response.body.error, "Failed to upload media");
});

test("DELETE /api/media rejects requests with no session", async () => {
  const response = await supertest(app)
    .delete("/api/media")
    .send({ publicId: "user_media/7/composer/x" });

  assert.equal(response.status, 401);
});

test("DELETE /api/media deletes the caller's own media", async (t) => {
  const destroyMock = t.mock.method(
    mediaService,
    "destroyFromCloudinary",
    async () => ({ result: "ok" }),
  );

  const response = await supertest(app)
    .delete("/api/media")
    .set("Cookie", `auth-token=${tokenFor("user", "7")}`)
    .send({ publicId: "user_media/7/composer/x" });

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.publicId, "user_media/7/composer/x");
  assert.equal(destroyMock.mock.calls[0].arguments[0], "user_media/7/composer/x");
  assert.deepEqual(destroyMock.mock.calls[0].arguments[1], {
    resource_type: "image",
    invalidate: true,
  });
});

test("DELETE /api/media requires a publicId", async () => {
  const response = await supertest(app)
    .delete("/api/media")
    .set("Cookie", `auth-token=${tokenFor("user", "7")}`)
    .send({});

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
});

test("DELETE /api/media returns 403 for another user's media", async (t) => {
  const destroyMock = t.mock.method(
    mediaService,
    "destroyFromCloudinary",
    async () => ({ result: "ok" }),
  );

  const response = await supertest(app)
    .delete("/api/media")
    .set("Cookie", `auth-token=${tokenFor("user", "7")}`)
    .send({ publicId: "user_media/9/composer/x" });

  assert.equal(response.status, 403);
  assert.equal(response.body.success, false);
  assert.equal(destroyMock.mock.calls.length, 0);
});

test("DELETE /api/media rejects traversal without calling Cloudinary", async (t) => {
  const destroyMock = t.mock.method(mediaService, "destroyFromCloudinary", async () => ({ result: "ok" }));
  const response = await supertest(app)
    .delete("/api/media")
    .set("Cookie", `auth-token=${tokenFor("user", "7")}`)
    .send({ publicId: "user_media/7/../9/composer/x" });

  assert.equal(response.status, 403);
  assert.equal(destroyMock.mock.calls.length, 0);
});

test("DELETE /api/media validates resourceType", async (t) => {
  const destroyMock = t.mock.method(mediaService, "destroyFromCloudinary", async () => ({ result: "ok" }));
  const response = await supertest(app)
    .delete("/api/media")
    .set("Cookie", `auth-token=${tokenFor("user", "7")}`)
    .send({ publicId: "user_media/7/composer/x", resourceType: "raw" });

  assert.equal(response.status, 400);
  assert.equal(destroyMock.mock.calls.length, 0);
});

test("DELETE /api/media returns 500 when the delete service fails", async (t) => {
  t.mock.method(mediaService, "destroyFromCloudinary", async () => {
    throw new Error("Cloudinary boom");
  });

  const response = await supertest(app)
    .delete("/api/media")
    .set("Cookie", `auth-token=${tokenFor("user", "7")}`)
    .send({ publicId: "user_media/7/composer/x" });

  assert.equal(response.status, 500);
  assert.equal(response.body.success, false);
  assert.equal(response.body.error, "Failed to delete media");
});
