pipeline {
    agent any

    stages {

        stage('Checkout') {
            steps {
                echo 'Checking out project source code'
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'npm install'
            }
        }

        stage('Run Tests') {
            steps {
                sh 'npm test'
            }
        }

        stage('Build Docker Image') {
            steps {
                sh 'docker build -t library-management-system:latest .'
            }
        }
    }

    post {
        success {
            echo 'Library project pipeline completed successfully!'
        }

        failure {
            echo 'Library project pipeline failed!'
        }
    }
}