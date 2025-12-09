# The Infinite Daily Planner

A highly visual and intuitive daily reminder and planning tool that combines the structure of a Kanban board with the functionality of a recurring event calendar.

## Features

- **Infinite Kanban Daily View**: Each column represents a day, with infinite scroll through past and future dates
- **Drag & Drop**: Move event cards between days to reschedule tasks
- **Advanced Recurring Reminders**: 
  - Daily events
  - Every X days (e.g., every 3 days)
  - Days of the week (e.g., Monday and Wednesday)
- **Calendar View**: Traditional monthly calendar view for overview
- **Completion Tracking**: Mark events as complete while keeping the recurring pattern active
- **User Authentication**: Secure login and registration

## Tech Stack

- **Frontend**: Next.js 16 (React 19) with TypeScript
- **Styling**: Tailwind CSS
- **Database**: MongoDB with Mongoose
- **Drag & Drop**: @dnd-kit
- **Date Handling**: date-fns

## Getting Started

### Prerequisites

- Node.js 18+ 
- MongoDB (local or MongoDB Atlas)

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd dog-tracker
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` and add your MongoDB connection string:
```
MONGODB_URI=mongodb://localhost:27017/infinite-daily-planner
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

### First Steps

1. Create an account at `/register`
2. Log in at `/login`
3. Start creating recurring events from the dashboard
4. View your events in the Kanban board or Calendar view

## Project Structure

```
├── app/
│   ├── api/              # API routes
│   │   ├── auth/         # Authentication endpoints
│   │   └── events/       # Event management endpoints
│   ├── dashboard/        # Main dashboard page
│   ├── login/            # Login page
│   └── register/         # Registration page
├── components/            # React components
│   ├── AuthForm.tsx
│   ├── CalendarView.tsx
│   ├── CreateEventModal.tsx
│   ├── EventCard.tsx
│   └── KanbanBoard.tsx
├── lib/                   # Utility functions
│   ├── mongodb.ts        # Database connection
│   └── recurrence.ts     # Recurrence logic
└── models/                # Mongoose models
    ├── EventCard.ts
    ├── RecurringEvent.ts
    └── User.ts
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create new user account
- `POST /api/auth/login` - User login

### Events
- `GET /api/events/recurring` - Get all recurring events
- `POST /api/events/recurring` - Create new recurring event
- `GET /api/events/cards` - Get event cards for date range
- `PATCH /api/events/cards` - Update event card (move, complete, etc.)

## Future Enhancements

- [ ] Email/Push notifications
- [ ] Categorization and tagging
- [ ] Export/Import functionality
- [ ] Mobile app
- [ ] Sharing and collaboration

## License

MIT
