# DevOpsEase - Docker Container Intelligence Platform

A comprehensive full-stack application for intelligent Docker container monitoring, analysis, and failure diagnostics with cloud deployment capabilities.

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18+)
- **npm** or **yarn**
- **Docker** (for container operations)

### Installation & Setup

#### 1. Clone the Repository

```bash
git clone https://github.com/mamun0193/devopsease.git
cd devopsease
```

#### 2. Setup Backend Server

```bash
cd server
npm install
```

Create a `.env` file in the server directory:

```env
PORT=4000
NODE_ENV=development
```

Start the backend server:

```bash
npm start
```

The server will run on `http://localhost:4000`

#### 3. Setup Frontend Dashboard

```bash
cd dashboard
npm install
```

Start the development server:

```bash
npm run dev
```

The dashboard will typically run on `http://localhost:5173`

### Build for Production

**Dashboard:**

```bash
cd dashboard
npm run build
```

Output is generated in the `dist/` directory.

---

## 📋 Project Structure

```
devopsease/
├── dashboard/              # React + Vite frontend application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── api/           # API integration
│   │   └── utils/         # Utility functions
│   ├── package.json
│   └── vite.config.ts
│
├── server/                # Express.js backend application
│   ├── src/
│   │   ├── docker/        # Docker client & container operations
│   │   ├── intelligence/  # ML-based failure analysis & classification
│   │   ├── routes/        # API endpoints
│   │   ├── services/      # Business logic
│   │   └── middlewares/   # Express middlewares
│   ├── models/            # Data models & schemas
│   └── package.json
│
├── docs/                  # Learning documentation
└── README.md
```

### Key Features

**Backend (Server):**
- Real-time Docker container monitoring
- Intelligent failure analysis with AI-powered classification
- Container inspection and log parsing
- Health check endpoints
- RESTful API endpoints

**Frontend (Dashboard):**
- Container list and details view
- Real-time container monitoring
- Failure analysis visualization
- Log viewer
- Responsive UI with React + Tailwind CSS

---

## 📚 Learning Roadmap

This project is part of a comprehensive Docker & AWS cloud deployment learning series. Navigate through the days using the links below:

### Days 1-2 (Current Repository)

- [Day 1: Docker Backend Fundamentals](./docs/DAY_1.md)
- [Day 2: Professional Backend Architecture](./docs/DAY_2.md)

### Days 3-15 (Related Repositories)

**Docker Fundamentals Series:**
- Repository: [docker-fundamentals](https://github.com/mamun0193/docker-fundamentals.git)
- Topics: Container basics, images, volumes, networking, orchestration

**AWS Cloud Deployment Series:**
- Repository: [rexpress-docker-aws](https://github.com/mamun0193/rexpress-docker-aws.git)
- Topics: AWS ECS Fargate, ElastiCache, CloudWatch, CI/CD automation

### Days 16-25 (Current Repository)

- [Day 16 — Failure Taxonomy](./docs/DAY_16.md)
- [Day 17 — Failure Detection & Intelligence](./docs/DAY_17.md)
- [Day 18 — API Integration & Real-Time Failure Analysis](./docs/DAY_18.md)
- [Day 19 — Failure History & Confidence Boosting](./docs/DAY_19.md)
- [Day 20 — Observability & Routing Enhancements](./docs/DAY_20.md)
- [Day 21: Advanced Log Parsing & Filtering](./docs/DAY_21.md)
- [Day 22: Frontend LogViewer Component](./docs/DAY_22.md)
- [Day 23: Container Control Backend APIs](./docs/DAY_23.md)
- [Day 24: Container Controls UI (React + Redux)](./docs/DAY_24.md)
- [Day 25: Container Stats & Resource Usage](./docs/DAY_25.md)

---

## 📖 Additional Resources

- [Node.js Documentation](https://nodejs.org/docs/)
- [Docker Documentation](https://docs.docker.com/)
- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [React Documentation](https://react.dev/)
- [Express.js Guide](https://expressjs.com/)

---

## 📝 License

This project is part of a learning series. See individual repositories for license information.

---

## 👨‍💻 Author

**Mamun** - [GitHub Profile](https://github.com/mamun0193)

---

**Happy Learning! 🚀**
