let currentRole = null;

async function api(url, method = "GET", data = null) {
    const options = {
        method,
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "same-origin"
    };

    if (data !== null) {
        options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);
    const result = await response.json();

    if (!response.ok) {
        throw new Error(result.message || "Something went wrong");
    }

    return result;
}

function showSection(id) {
    document.querySelectorAll(".section").forEach(section => {
        section.classList.add("hidden");
    });

    document.getElementById(id).classList.remove("hidden");
}

function showMessage(id, message) {
    document.getElementById(id).textContent = message;
}

// LOAD BOOKS

async function loadBooks() {
    try {
        const books = await api("/api/books");

        document.getElementById("totalBooks").textContent =
            books.reduce((sum, b) => sum + b.quantity, 0);

        document.getElementById("availableBooks").textContent =
            books.reduce((sum, b) => sum + b.available, 0);

        const table = document.getElementById("bookTable");

        table.innerHTML = books.map(book => `
            <tr>
                <td>${escapeHTML(book.title)}</td>
                <td>${escapeHTML(book.author)}</td>
                <td>${escapeHTML(book.isbn)}</td>
                <td>${book.available}</td>
                <td>
                    ${currentRole === "student" && book.available > 0
                        ? `<button onclick="issueBook('${book.id}')">Issue</button>`
                        : "—"}
                </td>
            </tr>
        `).join("");

        if (currentRole === "admin") {
            loadAdminBooks(books);
        }

    } catch (error) {
        console.error(error);
    }
}

// PREVENT HTML INJECTION

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

// SEARCH BOOKS

async function searchBooks() {
    const query = document.getElementById("searchInput").value;

    try {
        const books = await api(
            `/api/books/search?q=${encodeURIComponent(query)}`
        );

        const table = document.getElementById("bookTable");

        table.innerHTML = books.map(book => `
            <tr>
                <td>${escapeHTML(book.title)}</td>
                <td>${escapeHTML(book.author)}</td>
                <td>${escapeHTML(book.isbn)}</td>
                <td>${book.available}</td>
                <td>
                    ${currentRole === "student" && book.available > 0
                        ? `<button onclick="issueBook('${book.id}')">Issue</button>`
                        : "—"}
                </td>
            </tr>
        `).join("");

    } catch (error) {
        alert(error.message);
    }
}

// STUDENT REGISTRATION

document.getElementById("registerForm")
.addEventListener("submit", async function(event) {
    event.preventDefault();

    try {
        const result = await api(
            "/api/students/register",
            "POST",
            {
                name: document.getElementById("studentName").value,
                email: document.getElementById("studentEmail").value,
                password: document.getElementById("studentPassword").value
            }
        );

        showMessage("registerMessage", result.message);
        this.reset();

    } catch (error) {
        showMessage("registerMessage", error.message);
    }
});

// LOGIN

document.getElementById("loginForm")
.addEventListener("submit", async function(event) {
    event.preventDefault();

    const type = document.getElementById("loginType").value;
    const username = document.getElementById("loginUsername").value;
    const password = document.getElementById("loginPassword").value;

    try {
        let result;

        if (type === "admin") {
            result = await api("/api/admin/login", "POST", {
                username,
                password
            });

            currentRole = "admin";
            showSection("adminDashboard");
            await loadBooks();

            const transactions = await api("/api/admin/transactions");
            displayAdminTransactions(transactions);

        } else {
            result = await api("/api/students/login", "POST", {
                email: username,
                password
            });

            currentRole = "student";

            document.getElementById("studentWelcome").textContent =
                "Welcome, " + result.student.name;

            showSection("studentDashboard");

            await loadBooks();
            await loadStudentTransactions();
        }

        showMessage("loginMessage", result.message);
        this.reset();

    } catch (error) {
        showMessage("loginMessage", error.message);
    }
});

// ADD BOOK

document.getElementById("bookForm")
.addEventListener("submit", async function(event) {
    event.preventDefault();

    try {
        const result = await api("/api/books", "POST", {
            title: document.getElementById("bookTitle").value,
            author: document.getElementById("bookAuthor").value,
            isbn: document.getElementById("bookISBN").value,
            quantity: Number(document.getElementById("bookQuantity").value)
        });

        alert(result.message);
        this.reset();

        await loadBooks();

    } catch (error) {
        alert(error.message);
    }
});

// ADMIN BOOK TABLE

async function loadAdminBooks(books) {
    const table = document.getElementById("adminBookTable");

    table.innerHTML = books.map(book => `
        <tr>
            <td>${escapeHTML(book.title)}</td>
            <td>${escapeHTML(book.author)}</td>
            <td>${book.quantity}</td>
            <td>${book.available}</td>
            <td>
                <button onclick="editBook('${book.id}')">Edit</button>
                <button onclick="deleteBook('${book.id}')">Delete</button>
            </td>
        </tr>
    `).join("");
}

// EDIT BOOK

async function editBook(id) {
    try {
        const books = await api("/api/books");
        const book = books.find(b => b.id === id);

        const title = prompt("Enter book title:", book.title);
        if (title === null) return;

        const author = prompt("Enter author:", book.author);
        if (author === null) return;

        const isbn = prompt("Enter ISBN:", book.isbn);
        if (isbn === null) return;

        const quantity = prompt("Enter total quantity:", book.quantity);
        if (quantity === null) return;

        const result = await api(`/api/books/${id}`, "PUT", {
            title,
            author,
            isbn,
            quantity: Number(quantity)
        });

        alert(result.message);
        await loadBooks();

    } catch (error) {
        alert(error.message);
    }
}

// DELETE BOOK

async function deleteBook(id) {
    if (!confirm("Are you sure you want to delete this book?")) {
        return;
    }

    try {
        const result = await api(`/api/books/${id}`, "DELETE");
        alert(result.message);
        await loadBooks();

    } catch (error) {
        alert(error.message);
    }
}

// ISSUE BOOK

async function issueBook(bookId) {
    try {
        const result = await api("/api/books/issue", "POST", {
            bookId
        });

        alert(result.message);

        await loadBooks();
        await loadStudentTransactions();

    } catch (error) {
        alert(error.message);
    }
}

// STUDENT TRANSACTIONS

async function loadStudentTransactions() {
    try {
        const transactions = await api(
            "/api/student/transactions"
        );

        const books = await api("/api/books");

        const table = document.getElementById("studentTransactions");

        const active = transactions.filter(t => !t.returnDate);

        table.innerHTML = active.map(t => {
            const book = books.find(b => b.id === t.bookId);

            return `
                <tr>
                    <td>${escapeHTML(t.id)}</td>
                    <td>${book ? escapeHTML(book.title) : "Unknown"}</td>
                    <td>${new Date(t.dueDate).toLocaleDateString()}</td>
                    <td>Calculated on return</td>
                    <td>
                        <button onclick="returnBook('${t.id}')">
                            Return
                        </button>
                    </td>
                </tr>
            `;
        }).join("");

    } catch (error) {
        console.error(error);
    }
}

// RETURN BOOK

async function returnBook(transactionId) {
    if (!confirm("Do you want to return this book?")) {
        return;
    }

    try {
        const result = await api("/api/books/return", "POST", {
            transactionId
        });

        alert(
            result.message +
            "\nOverdue days: " + result.overdueDays +
            "\nFine: ₹" + result.fine
        );

        await loadBooks();
        await loadStudentTransactions();

    } catch (error) {
        alert(error.message);
    }
}

// ADMIN TRANSACTIONS

async function displayAdminTransactions(transactions) {
    const books = await api("/api/books");

    const students = await api("/api/admin/students").catch(() => []);

    const container = document.getElementById("adminTransactions");

    container.innerHTML = `
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Student</th>
                        <th>Book</th>
                        <th>Issue Date</th>
                        <th>Return Status</th>
                        <th>Fine</th>
                    </tr>
                </thead>
                <tbody>
                    ${transactions.map(t => {
                        const book = books.find(b => b.id === t.bookId);
                        const student = students.find(s => s.id === t.studentId);

                        return `
                            <tr>
                                <td>${student ? escapeHTML(student.name) : "Student"}</td>
                                <td>${book ? escapeHTML(book.title) : "Unknown"}</td>
                                <td>${new Date(t.issueDate).toLocaleDateString()}</td>
                                <td>${t.returnDate ? "Returned" : "Not Returned"}</td>
                                <td>₹${t.fine}</td>
                            </tr>
                        `;
                    }).join("")}
                </tbody>
            </table>
        </div>
    `;
}

// LOGOUT

async function logout() {
    try {
        await api("/api/logout", "POST");

        currentRole = null;

        showSection("home");
        await loadBooks();

        alert("Logged out successfully");

    } catch (error) {
        alert(error.message);
    }
}

// INITIAL LOAD

loadBooks();