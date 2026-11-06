const request = require("supertest");
const app = require("../server");

describe("Library Management System API", () => {

    test("TC01 - Server should respond to book request", async () => {
        const response = await request(app)
            .get("/api/books");

        expect(response.statusCode).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
    });

    test("TC02 - Admin login with invalid credentials", async () => {
        const response = await request(app)
            .post("/api/admin/login")
            .send({
                username: "wrong",
                password: "wrong"
            });

        expect(response.statusCode).toBe(401);
    });

    test("TC03 - Student registration validation", async () => {
        const response = await request(app)
            .post("/api/students/register")
            .send({
                name: "",
                email: "",
                password: ""
            });

        expect(response.statusCode).toBe(400);
    });

    test("TC04 - Book search", async () => {
        const response = await request(app)
            .get("/api/books/search?q=Alchemist");

        expect(response.statusCode).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
    });

    test("TC05 - Admin access protection", async () => {
        const response = await request(app)
            .post("/api/books")
            .send({
                title: "Test Book",
                author: "Test Author",
                isbn: "TEST123",
                quantity: 2
            });

        expect(response.statusCode).toBe(401);
    });

    test("TC06 - Student transaction access protection", async () => {
        const response = await request(app)
            .get("/api/student/transactions");

        expect(response.statusCode).toBe(401);
    });

    test("TC07 - Invalid book update", async () => {
        const agent = request.agent(app);

        await agent.post("/api/admin/login").send({
            username: "admin",
            password: "admin123"
        });

        const response = await agent
            .put("/api/books/invalid-id")
            .send({
                title: "Updated Book"
            });

        expect(response.statusCode).toBe(404);
    });

});