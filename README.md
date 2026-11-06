# Online Library Management System

## Project Description

The Online Library Management System is a web-based
application developed to manage library activities
efficiently.

It helps administrators manage books and students
borrow and return books online.

## Technologies Used

- HTML
- CSS
- JavaScript
- Node.js
- Express.js
- JSON
- Jest
- Docker
- Jenkins
- Kubernetes

## Modules

1. Admin Login
2. Add Books
3. Update Books
4. Delete Books
5. Search Books
6. Student Registration
7. Student Login
8. Issue Books
9. Return Books
10. Calculate Overdue Fines

## Installation

Step 1: Install Node.js.

Step 2: Open the project folder in VS Code.

Step 3: Install dependencies.

npm install

Step 4: Start the application.

npm start

Step 5: Open the browser.

http://localhost:3000

## Admin Credentials

Username: admin
Password: admin123

## Library Rules

Book issue duration: 14 days

Fine per overdue day: Rs. 5

## Run Tests

npm test

## Docker Commands

Build image:

docker build -t library-management-system .

Run container:

docker run -p 3000:3000 library-management-system

## Kubernetes Deployment

kubectl apply -f k8s/deployment.yaml

Check deployment:

kubectl get deployments

Check services:

kubectl get services

## Conclusion

The Online Library Management System simplifies
library operations by automating book management,
student registration, book issuing, returning
and overdue fine calculation.