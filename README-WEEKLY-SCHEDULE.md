# Weekly Scheduling System for ERS

This document explains the new weekly scheduling system that has been added to the Employee Roster System (ERS).

## Overview

The weekly scheduling system allows employees to book their schedules for an entire week, with the following features:

1. **Time slots management**: Admins can create, update, and delete time slots for each day of the week
2. **Employee limits**: Admins can set how many employees can work during each time slot
3. **Availability checking**: Employees cannot book time slots that are already at full capacity
4. **Roster views**: Admins can view weekly and department-specific rosters
5. **Timesheet tracking**: Employees and admins can view hours worked

## Database Changes

The following tables have been added to the database:

1. `time_slots`: Defines available time slots for each day of the week
2. `time_slot_limits`: Specifies how many employees can work during each time slot
3. New columns in `schedules`: `time_slot_id` and `week_start_date`

## API Endpoints

### Time Slots Management

- `GET /api/time-slots`: Get all time slots
- `GET /api/time-slots/:id`: Get a specific time slot
- `POST /api/time-slots`: Create a new time slot (admin only)
- `PUT /api/time-slots/:id`: Update a time slot (admin only)
- `DELETE /api/time-slots/:id`: Delete a time slot (admin only)
- `GET /api/time-slots/:id/limit`: Get the employee limit for a time slot
- `POST /api/time-slots/:id/limit`: Set the employee limit for a time slot (admin only)
- `GET /api/time-slots/:id/availability`: Check availability for a time slot

### Weekly Schedules

- `POST /api/schedules/weekly`: Create a weekly schedule with multiple time slots

### Rosters and Timesheets

- `GET /api/roster/weekly`: Get the weekly roster (admin only)
- `GET /api/roster/departments/:department_id`: Get roster for a specific department (admin only)
- `GET /api/roster/employees/:employee_id/timesheet`: Get employee timesheet
- `GET /api/roster/daily`: Get the daily roster (admin only)
- `GET /api/roster/working`: Get all employees working at a specific time (admin only)

## Frontend Components

1. **WeeklyScheduleForm**: Allows employees to book their schedule for an entire week
2. **TimeSlotManager**: Admin interface for managing time slots and employee limits
3. **RosterView**: Displays the weekly roster for admins
4. **TimesheetView**: Shows employee work hours and shift details

## Security

- Non-admin users can only book schedules for their own employee record
- Non-admin users can only view their own timesheet
- Only admins can set employee limits for time slots
- Employees cannot book time slots that are already at maximum capacity

## Getting Started

### For Admins:

1. Go to the Admin Dashboard
2. Click on "Manage Time Slots"
3. Add time slots for each day of the week
4. Set employee limits for each time slot
5. View and manage the roster from the Roster View

### For Employees:

1. Go to the Schedules page
2. Click on "Create Weekly Schedule"
3. Select the week start date
4. Choose available time slots for each day of the week
5. Submit the schedule request

## Notes

- Time slots that are fully booked will be marked as unavailable
- Admin users can override the capacity limits when needed
- Weekly schedules follow a Sunday-to-Saturday pattern
- The timesheet calculates total hours worked automatically 