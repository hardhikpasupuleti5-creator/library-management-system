const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET || "library-demo-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        maxAge: 60 * 60 * 1000
    }
}));

app.use(express.static(path.join(__dirname, "public")));

const dataPath = path.join(__dirname, "data");

if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true });
}

function readData(file) {
    const filePath = path.join(dataPath, file);

    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, "[]");
    }

    return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeData(file, data) {
    fs.writeFileSync(
        path.join(dataPath, file),
        JSON.stringify(data, null, 2)
    );
}

function adminAuth(req, res, next) {
    if (req.session.role !== "admin") {
        return res.status(401).json({
            message: "Admin login required"
        });
    }
    next();
}

function studentAuth(req, res, next) {
    if (req.session.role !== "student") {
        return res.status(401).json({
            message: "Student login required"
        });
    }
    next();
}

// ADMIN LOGIN

app.post("/api/admin/login", (req, res) => {
    const { username, password } = req.body;

    if (
        username === (process.env.ADMIN_USERNAME || "admin") &&
        password === (process.env.ADMIN_PASSWORD || "admin123")
    ) {
        req.session.role = "admin";
        return res.json({
            message: "Admin login successful"
        });
    }

    res.status(401).json({
        message: "Invalid admin credentials"
    });
});

// LOGOUT

app.post("/api/logout", (req, res) => {
    req.session.destroy(() => {
        res.json({
            message: "Logged out successfully"
        });
    });
});

// STUDENT REGISTRATION

app.post("/api/students/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password || password.length < 6) {
            return res.status(400).json({
                message: "Enter valid details. Password must be at least 6 characters."
            });
        }

        const students = readData("students.json");

        const exists = students.find(
            s => s.email.toLowerCase() === email.toLowerCase()
        );

        if (exists) {
            return res.status(409).json({
                message: "Student already registered"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const student = {
            id: Date.now().toString(),
            name,
            email: email.toLowerCase(),
            password: hashedPassword
        };

        students.push(student);
        writeData("students.json", students);

        res.status(201).json({
            message: "Student registered successfully"
        });

    } catch (error) {
        res.status(500).json({
            message: "Registration failed"
        });
    }
});

// STUDENT LOGIN

app.post("/api/students/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const students = readData("students.json");

        const student = students.find(
            s => s.email === (email || "").toLowerCase()
        );

        if (!student) {
            return res.status(401).json({
                message: "Student not found"
            });
        }

        const valid = await bcrypt.compare(
            password || "",
            student.password
        );

        if (!valid) {
            return res.status(401).json({
                message: "Incorrect password"
            });
        }

        req.session.role = "student";
        req.session.studentId = student.id;

        res.json({
            message: "Student login successful",
            student: {
                id: student.id,
                name: student.name,
                email: student.email
            }
        });

    } catch (error) {
        res.status(500).json({
            message: "Login failed"
        });
    }
});

// VIEW BOOKS

app.get("/api/books", (req, res) => {
    res.json(readData("books.json"));
});

// SEARCH BOOKS

app.get("/api/books/search", (req, res) => {
    const search = (req.query.q || "").toLowerCase();
    const books = readData("books.json");

    const result = books.filter(book =>
        book.title.toLowerCase().includes(search) ||
        book.author.toLowerCase().includes(search) ||
        book.isbn.toLowerCase().includes(search)
    );

    res.json(result);
});

// ADD BOOK

app.post("/api/books", adminAuth, (req, res) => {
    const { title, author, isbn, quantity } = req.body;

    if (!title || !author || !isbn || quantity === undefined) {
        return res.status(400).json({
            message: "All book details are required"
        });
    }

    const books = readData("books.json");

    if (books.some(b => b.isbn === isbn)) {
        return res.status(409).json({
            message: "Book already exists"
        });
    }

    const count = Number(quantity);

    if (!Number.isInteger(count) || count < 1) {
        return res.status(400).json({
            message: "Enter a valid quantity"
        });
    }

    const book = {
        id: Date.now().toString(),
        title,
        author,
        isbn,
        quantity: count,
        available: count
    };

    books.push(book);
    writeData("books.json", books);

    res.status(201).json({
        message: "Book added successfully",
        book
    });
});

// UPDATE BOOK

app.put("/api/books/:id", adminAuth, (req, res) => {
    const books = readData("books.json");
    const index = books.findIndex(b => b.id === req.params.id);

    if (index === -1) {
        return res.status(404).json({
            message: "Book not found"
        });
    }

    const oldBook = books[index];
    const { title, author, isbn, quantity } = req.body;

    const newQuantity = quantity === undefined
        ? oldBook.quantity
        : Number(quantity);

    const issued = oldBook.quantity - oldBook.available;

    if (!Number.isInteger(newQuantity) || newQuantity < issued) {
        return res.status(400).json({
            message: "Invalid book quantity"
        });
    }

    if (
        isbn &&
        books.some(b => b.isbn === isbn && b.id !== oldBook.id)
    ) {
        return res.status(409).json({
            message: "ISBN already exists"
        });
    }

    books[index] = {
        ...oldBook,
        title: title ?? oldBook.title,
        author: author ?? oldBook.author,
        isbn: isbn ?? oldBook.isbn,
        quantity: newQuantity,
        available: newQuantity - issued
    };

    writeData("books.json", books);

    res.json({
        message: "Book updated successfully",
        book: books[index]
    });
});

// DELETE BOOK

app.delete("/api/books/:id", adminAuth, (req, res) => {
    const books = readData("books.json");
    const book = books.find(b => b.id === req.params.id);

    if (!book) {
        return res.status(404).json({
            message: "Book not found"
        });
    }

    if (book.available !== book.quantity) {
        return res.status(400).json({
            message: "Cannot delete an issued book"
        });
    }

    writeData(
        "books.json",
        books.filter(b => b.id !== req.params.id)
    );

    res.json({
        message: "Book deleted successfully"
    });
});

// ISSUE BOOK

app.post("/api/books/issue", studentAuth, (req, res) => {
    const { bookId } = req.body;

    const books = readData("books.json");
    const transactions = readData("transactions.json");

    const book = books.find(b => b.id === bookId);

    if (!book) {
        return res.status(404).json({
            message: "Book not found"
        });
    }

    if (book.available <= 0) {
        return res.status(400).json({
            message: "Book is unavailable"
        });
    }

    const alreadyIssued = transactions.some(t =>
        t.studentId === req.session.studentId &&
        t.bookId === bookId &&
        !t.returnDate
    );

    if (alreadyIssued) {
        return res.status(400).json({
            message: "You already have this book"
        });
    }

    book.available--;

    const issueDate = new Date();
    const dueDate = new Date(issueDate);
    dueDate.setDate(dueDate.getDate() + 14);

    const transaction = {
        id: Date.now().toString(),
        studentId: req.session.studentId,
        bookId,
        issueDate: issueDate.toISOString(),
        dueDate: dueDate.toISOString(),
        returnDate: null,
        fine: 0
    };

    transactions.push(transaction);

    writeData("books.json", books);
    writeData("transactions.json", transactions);

    res.json({
        message: "Book issued successfully",
        transaction
    });
});

// RETURN BOOK

app.post("/api/books/return", studentAuth, (req, res) => {
    const { transactionId } = req.body;

    const books = readData("books.json");
    const transactions = readData("transactions.json");

    const transaction = transactions.find(t =>
        t.id === transactionId &&
        t.studentId === req.session.studentId &&
        !t.returnDate
    );

    if (!transaction) {
        return res.status(404).json({
            message: "Active transaction not found"
        });
    }

    const book = books.find(
        b => b.id === transaction.bookId
    );

    if (!book) {
        return res.status(404).json({
            message: "Book not found"
        });
    }

    const returnDate = new Date();

    const overdueDays = Math.max(
        0,
        Math.ceil(
            (returnDate - new Date(transaction.dueDate)) /
            (1000 * 60 * 60 * 24)
        )
    );

    const fine = overdueDays * 5;

    transaction.returnDate = returnDate.toISOString();
    transaction.fine = fine;

    book.available++;

    writeData("books.json", books);
    writeData("transactions.json", transactions);

    res.json({
        message: "Book returned successfully",
        overdueDays,
        fine
    });
});

// STUDENT TRANSACTIONS

app.get("/api/student/transactions", studentAuth, (req, res) => {
    const transactions = readData("transactions.json");

    res.json(
        transactions.filter(
            t => t.studentId === req.session.studentId
        )
    );
});

// ADMIN TRANSACTIONS

app.get("/api/admin/transactions", adminAuth, (req, res) => {
    res.json(readData("transactions.json"));
});

// START SERVER

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
    });
}

module.exports = app;