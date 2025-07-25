import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Schedules.css';
import './WeeklyScheduleForm.css';

// Add some additional styles
const styles = {
  scheduleHeaderActions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  refreshButton: {
    padding: '8px 16px',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '5px'
  },
  refreshButtonDisabled: {
    backgroundColor: '#cccccc',
    cursor: 'not-allowed'
  }
};

const WeeklyScheduleForm = () => {
  const navigate = useNavigate();
  const { currentUser: user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [weekStartDate, setWeekStartDate] = useState('');
  const [timeSlots, setTimeSlots] = useState([]);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState({
    0: '', 1: '', 2: '', 3: '', 4: '', 5: '', 6: ''
  });
  const [slotAvailability, setSlotAvailability] = useState({});
  const [systemSettings, setSystemSettings] = useState({ first_day_of_week: 1 });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Standard day names array (0=Sunday, 1=Monday, etc.)
  const standardDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  // Fetch system settings first
  useEffect(() => {
    const fetchSystemSettings = async () => {
      try {
        const response = await axios.get('/settings');
        if (response.data && response.data.success) {
          setSystemSettings(response.data.data);
          console.log('System settings loaded:', response.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch system settings:', err);
        // Default to standard first_day_of_week = 1 (Monday)
      }
    };
    
    fetchSystemSettings();
  }, []);
  
  // Get the current week's start date (based on system settings)
  const getCurrentWeekStartDate = () => {
    console.log('=============== CURRENT WEEK CALCULATION ===============');
    
    // Use the actual current date (not a cached or hardcoded one)
    const now = new Date();
    console.log('Current browser time:', now.toString());
    console.log('Current ISO date:', now.toISOString());
    
    // Create a clean date object with only the date part, no time
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    console.log('Clean today date (no time):', today.toISOString());
    
    // Get the day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    const todayJSDay = today.getDay();
    console.log('Day of week (0=Sunday, 1=Monday, etc.):', todayJSDay);
    
    // First day of week based on system settings
    const firstDayOfWeek = systemSettings.first_day_of_week;
    console.log('System settings first day of week:', firstDayOfWeek);
    
    // Calculate the difference to go back to the first day of the week
    // If today is the first day of the week, daysToSubtract will be 0
    const daysToSubtract = (todayJSDay - firstDayOfWeek + 7) % 7;
    console.log('Days to subtract to get to first day of week:', daysToSubtract);
    
    // Calculate the start date by going back daysToSubtract days
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - daysToSubtract);
    console.log('Calculated week start date:', startDate.toISOString());
    
    // Explicitly format the date to avoid timezone issues
    const year = startDate.getFullYear();
    const month = String(startDate.getMonth() + 1).padStart(2, '0');
    const day = String(startDate.getDate()).padStart(2, '0');
    
    const dateString = `${year}-${month}-${day}`;
    console.log('Formatted week start date string:', dateString);
    console.log('=======================================================');
    
    return dateString;
  };
  
  // Initialize dates when the component mounts and system settings are loaded
  useEffect(() => {
    setWeekStartDate(getCurrentWeekStartDate());
  }, [systemSettings]);
  
  // Get ordered day names based on the system settings first_day_of_week
  // This is only for visual ordering in the UI
  const getOrderedDaysForDisplay = () => {
    const firstDayOfWeek = systemSettings.first_day_of_week;
    
    // Reorder days based on first_day_of_week
    const orderedDays = [];
    for (let i = 0; i < 7; i++) {
      const dayIndex = (i + firstDayOfWeek) % 7;
      orderedDays.push({
        name: standardDays[dayIndex],
        value: dayIndex, // This is the actual standard JavaScript day value (0=Sun, 1=Mon, etc.)
        displayIndex: i  // This is the display position (0=first day shown, 1=second day shown, etc.)
      });
    }
    
    return orderedDays;
  };
  
  // Debug function - add to component for testing
  const debugTimezoneDifferences = () => {
    console.log('========== TIMEZONE DEBUG INFO ==========');
    
    // Get current date in multiple formats
    const now = new Date();
    console.log('Browser current date object:', now);
    console.log('Browser toString():', now.toString());
    console.log('Browser toISOString():', now.toISOString());
    console.log('Browser toLocaleDateString():', now.toLocaleDateString());
    console.log('Browser toUTCString():', now.toUTCString());
    
    // Test with May 5, 2025 (the problematic date)
    const testDate = new Date('2025-05-05');
    console.log('Test date (2025-05-05) as Date object:', testDate);
    console.log('Test date toString():', testDate.toString());
    console.log('Test date toISOString():', testDate.toISOString());
    console.log('Test date toLocaleDateString():', testDate.toLocaleDateString());
    console.log('Test date getDate():', testDate.getDate());
    console.log('Test date getMonth():', testDate.getMonth());
    console.log('Test date getFullYear():', testDate.getFullYear());
    console.log('Test date getDay() (day of week):', testDate.getDay());
    
    // Test with May 9, 2025 (current date)
    const todayDate = new Date('2025-05-09');
    console.log('Today date (2025-05-09) as Date object:', todayDate);
    console.log('Today date toString():', todayDate.toString());
    console.log('Today date toISOString():', todayDate.toISOString());
    console.log('Today date toLocaleDateString():', todayDate.toLocaleDateString());
    console.log('Today date getDate():', todayDate.getDate());
    console.log('Today date getMonth():', todayDate.getMonth());
    console.log('Today date getFullYear():', todayDate.getFullYear());
    console.log('Today date getDay() (day of week):', todayDate.getDay());
    
    // Test date string formatting with these dates
    console.log('May 4th formatted:', new Date('2025-05-04').toISOString().split('T')[0]);
    console.log('May 5th formatted:', new Date('2025-05-05').toISOString().split('T')[0]);
    console.log('May 9th formatted:', new Date('2025-05-09').toISOString().split('T')[0]);
    
    // Try different date creation methods
    const directDate = new Date(2025, 4, 9); // Note: month is 0-based in JS
    console.log('Direct date creation May 9th:', directDate.toISOString());
    console.log('Direct date to string:', directDate.toISOString().split('T')[0]);
    
    // Calculate week start date from problematic date
    const testWeekStart = new Date('2025-05-04');
    const dayOfWeek = testWeekStart.getDay(); // 0 = Sunday
    const firstDayOfWeek = systemSettings.first_day_of_week; // 1 = Monday
    const daysToSubtract = (dayOfWeek - firstDayOfWeek + 7) % 7;
    console.log('For May 4th:');
    console.log('- Day of week:', dayOfWeek);
    console.log('- First day of week setting:', firstDayOfWeek);
    console.log('- Days to subtract:', daysToSubtract);
    const calculatedWeekStart = new Date(testWeekStart);
    calculatedWeekStart.setDate(testWeekStart.getDate() - daysToSubtract);
    console.log('- Calculated week start from May 4th:', calculatedWeekStart.toISOString().split('T')[0]);
    
    console.log('========== END TIMEZONE DEBUG INFO ==========');
  };
  
  // Auto-run debug function on component mount
  useEffect(() => {
    debugTimezoneDifferences();
  }, []);
  
  // Determine if a specific time slot is in the past
  const isTimeSlotPast = (date, timeSlot) => {
    const now = new Date(); // Current date and time
    
    // Create a clean date object for comparison
    const slotDate = new Date(date);
    
    // If the date is before today, it's definitely in the past
    if (slotDate.getFullYear() < now.getFullYear() ||
        (slotDate.getFullYear() === now.getFullYear() && slotDate.getMonth() < now.getMonth()) ||
        (slotDate.getFullYear() === now.getFullYear() && slotDate.getMonth() === now.getMonth() && 
         slotDate.getDate() < now.getDate())) {
      return true;
    }
    
    // If it's today, check the actual time
    if (slotDate.getFullYear() === now.getFullYear() && 
        slotDate.getMonth() === now.getMonth() && 
        slotDate.getDate() === now.getDate()) {
      
      if (!timeSlot || !timeSlot.start_time) {
        return false; // No time slot information available
      }
      
      // Parse the time from the slot
      const [hours, minutes] = timeSlot.start_time.split(':').map(Number);
      
      // Create date object for the time slot start time
      const slotStartTime = new Date(slotDate);
      slotStartTime.setHours(hours, minutes, 0, 0);
      
      // If current time is past the slot start time, consider it past
      return now >= slotStartTime;
    }
    
    return false; // Not in the past
  };
  
  // This now just checks if the day is completely in the past (before today)
  // We'll do the more granular time-based check when rendering each slot
  const disabledDays = useMemo(() => {
    if (!weekStartDate) return {};
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    
    const weekStart = new Date(weekStartDate);
    const disabledDaysObj = {};
    
    // Check each day of the week
    for (let i = 0; i < 7; i++) {
      const currentDay = new Date(weekStart);
      currentDay.setDate(weekStart.getDate() + i);
      
      // Only disable the entire day if it's strictly in the past
      disabledDaysObj[i] = currentDay < today;
    }
    
    return disabledDaysObj;
  }, [weekStartDate]);
  
  // Get employees based on user role
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/employees');
        
        // For non-admin users, filter to only show their own employee record
        if (user && user.role !== 'admin') {
          const userEmployee = response.data.data.find(emp => emp.user_id === user.id);
          setEmployees(userEmployee ? [userEmployee] : []);
          if (userEmployee) {
            setSelectedEmployee(userEmployee.id);
          }
        } else {
          setEmployees(response.data.data);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch employees:', err);
        setError('Failed to fetch employees');
        setLoading(false);
      }
    };
    
    fetchEmployees();
  }, [user]);
  
  // Get time slots
  useEffect(() => {
    const fetchTimeSlots = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/time-slots');
        setTimeSlots(response.data.data);
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch time slots:', err);
        setError('Failed to fetch time slots');
        setLoading(false);
      }
    };
    
    fetchTimeSlots();
  }, []);
  
  // Reset selections and check availability when date or time slots change
  useEffect(() => {
    // Reset selected time slots when week start date changes
    setSelectedTimeSlots({
      0: '',
      1: '',
      2: '',
      3: '',
      4: '',
      5: '',
      6: ''
    });
    
    // Reset availability data
    setSlotAvailability({});

    // If we have time slots and a week start date, check availability for all slots at once
    if (timeSlots.length > 0 && weekStartDate) {
      checkBatchAvailability();
    }
  }, [weekStartDate, timeSlots]);
  
  // Batch check availability for all time slots
  const checkBatchAvailability = async () => {
    if (!weekStartDate || timeSlots.length === 0) return;
    
    try {
      setLoadingAvailability(true);
      setError('');
      
      console.log('============== CHECKING BATCH AVAILABILITY ==============');
      console.log('Current weekStartDate state:', weekStartDate);
      
      // Force refresh the current date to make sure we're not using cached values
      const currentDate = new Date();
      console.log('Current browser time:', currentDate.toString());
      console.log('Current ISO date:', currentDate.toISOString());
      console.log('Current date getFullYear:', currentDate.getFullYear());
      console.log('Current date getMonth:', currentDate.getMonth());
      console.log('Current date getDate:', currentDate.getDate());
      console.log('Current date getDay (day of week):', currentDate.getDay());
      
      // ALWAYS use today's actual date - this is critical for proper availability checks
      const todayStr = currentDate.toISOString().split('T')[0];
      console.log('TODAY\'S DATE (not week start):', todayStr);
      
      // Log for debugging
      console.log('IMPORTANT: Using today\'s date (' + todayStr + '), NOT the week start date (' + weekStartDate + ')');
      console.log('First day of week setting:', systemSettings.first_day_of_week);
      
      // Get all time slot IDs
      const timeSlotIds = timeSlots.map(slot => slot.id);
      console.log('Time slots to check:', timeSlotIds.length);
      
      // Make a single API call to check all time slots at once
      console.log('Sending API request to /time-slots/batch-availability with date:', todayStr);
      const response = await axios.post('/time-slots/batch-availability', {
        date: todayStr,
        timeSlotIds

      });
      
      // -------- ADD THIS BLOCK: Manual request to bypass any framework issues ---------
      console.log('SENDING DIRECT FETCH REQUEST INSTEAD OF AXIOS AS A TEST');
      const token = localStorage.getItem('token');
      const testResponse = await fetch('http://localhost:5000/api/time-slots/batch-availability', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          date: todayStr,
          timeSlotIds
        })
      });
      console.log('Direct fetch response status:', testResponse.status);
      // --------------------------------------------------------------------------
      
      console.log('Response received:', response.status);
      console.log('Response data:', response.data);
      
      const availabilityData = response.data.data;
      
      // Update the availability state with all results
      const newAvailability = {};
      Object.entries(availabilityData).forEach(([slotId, data]) => {
        newAvailability[slotId] = {
          available: data.available,
          current: data.count || 0,
          max: data.maxEmployees
        };
        console.log(`Time slot ${slotId}: ${data.count}/${data.maxEmployees !== null ? data.maxEmployees : 'unlimited'} (available: ${data.available})`);
      });
      
      console.log('Updating availability state with new data');
      setSlotAvailability(newAvailability);
      setLoadingAvailability(false);
      console.log('=============== AVAILABILITY CHECK COMPLETE ===============');
    } catch (err) {
      console.error('Failed to check time slot availability:', err);
      setError(`Failed to check time slot availability: ${err.response?.data?.message || err.message}`);
      setLoadingAvailability(false);
    }
  };
  
  // Check availability for a specific time slot (fallback method)
  const checkTimeSlotAvailability = async (timeSlotId) => {
    if (!timeSlotId) return;
    
    // If we already have the availability data, use it
    if (slotAvailability[timeSlotId]) {
      return slotAvailability[timeSlotId].available;
    }
    
    try {
      // Always use today's date for consistent availability checking
      const currentDate = new Date();
      const todayStr = currentDate.toISOString().split('T')[0];
      
      console.log('Checking single time slot availability using today\'s date:', todayStr);
      const response = await axios.get(`/time-slots/${timeSlotId}/availability-for-date?date=${todayStr}`);
      const { available, current_approved, max_employees } = response.data;
      
      // Update the availability state
      setSlotAvailability(prev => ({
        ...prev,
        [timeSlotId]: {
          available,
          current: current_approved,
          max: max_employees
        }
      }));
      
      return available;
    } catch (err) {
      console.error('Failed to check time slot availability:', err);
      setError(`Failed to check time slot availability: ${err.response?.data?.message || err.message}`);
      return false;
    }
  };
  
  // Handle time slot selection for a specific day
  const handleTimeSlotSelect = async (day, timeSlotId) => {
    // Don't allow selection for completely past days
    if (disabledDays[day]) {
      setError(`Cannot select time slots for past dates`);
      return;
    }
    
    // Don't proceed if same selection or empty selection
    if (selectedTimeSlots[day] === timeSlotId || !timeSlotId) {
      setSelectedTimeSlots(prev => ({
        ...prev,
        [day]: ''
      }));
      return;
    }
    
    // Get the time slot data
    const timeSlot = timeSlots.find(slot => slot.id === timeSlotId);
    if (!timeSlot) {
      setError('Invalid time slot selection');
      return;
    }
    
    // Check if this specific time slot is in the past
    const slotDate = getDateForDay(day);
    if (isTimeSlotPast(slotDate, timeSlot)) {
      setError(`Cannot select time slots that have already passed`);
      return;
    }
    
    // Get availability from state if available, otherwise check individually
    let isAvailable = false;
    if (slotAvailability[timeSlotId]) {
      isAvailable = slotAvailability[timeSlotId].available;
    } else {
      isAvailable = await checkTimeSlotAvailability(timeSlotId);
    }
    
    if (!isAvailable && user && user.role !== 'admin') {
      setError(`The selected time slot for ${standardDays[day]} is fully booked.`);
      return;
    }
    
    // Update selected time slots
    setSelectedTimeSlots(prev => ({
      ...prev,
      [day]: timeSlotId
    }));
    
    // Clear any previous error messages
    setError('');
  };
  
  // Get time slots for a specific day number (0=Sunday, 1=Monday, etc.)
  const getTimeSlotsForDay = (day) => {
    // Filter time slots to only include those for the current day
    return timeSlots
      .filter(slot => slot.day_of_week === parseInt(day))
      .map(slot => {
        // Get capacity information
        const { current, max } = getTimeSlotCapacity(slot.id);
        const capacityInfo = max !== null 
          ? `${current}/${max}`
          : 'No limit';
        
        // Check if this time slot is available
        const available = isTimeSlotAvailable(slot.id);
        
        // Check if this slot is selected
        const isSelected = selectedTimeSlots[day] === slot.id;
        
        return {
          ...slot,
          formatted: `${formatTime(slot.start_time)} - ${formatTime(slot.end_time)}`,
          capacityInfo,
          available,
          isSelected
        };
      })
      .sort((a, b) => {
        // Sort by start time
        return a.start_time.localeCompare(b.start_time);
      });
  };
  
  // Format time for display
  const formatTime = (timeString) => {
    if (!timeString) return '';
    
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    
    return `${displayHour}:${minutes} ${ampm}`;
  };
  
  // Helper function to check if a day is disabled (in the past)
  const isDisabledDay = (dayValue) => {
    if (!weekStartDate) return true;
    
    // Find the display index for this day value
    const dayInfo = orderedDaysForDisplay.find(d => d.value === dayValue);
    if (!dayInfo) return true;
    
    return disabledDays[dayInfo.displayIndex] || false;
  };
  
  // Calculate the date for a specific day
  const getDateForDay = (dayValue) => {
    if (!weekStartDate) return new Date();
    
    const weekStart = new Date(weekStartDate);
    const dayInfo = orderedDaysForDisplay.find(d => d.value === dayValue);
    
    if (!dayInfo) return weekStart;
    
    const resultDate = new Date(weekStart);
    resultDate.setDate(weekStart.getDate() + dayInfo.displayIndex);
    return resultDate;
  };
  
  // Handle week change
  const handleWeekChange = (direction) => {
    const currentDate = new Date(weekStartDate);
    console.log('Current week start date before change:', currentDate.toISOString());
    
    // Calculate the new date (7 days forward or backward)
    if (direction === 'next') {
      currentDate.setDate(currentDate.getDate() + 7);
    } else {
      currentDate.setDate(currentDate.getDate() - 7);
    }
    
    console.log('New week start date after change:', currentDate.toISOString());
    
    // Disallow going back to weeks before the current one
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get the current day of week in JS (0=Sunday)
    const todayJSDayOfWeek = today.getDay();
    
    // Calculate the first day of the current week based on system settings
    const firstDayOfWeek = systemSettings.first_day_of_week;
    const daysToSubtract = (todayJSDayOfWeek - firstDayOfWeek + 7) % 7;
    
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - daysToSubtract);
    
    console.log('Current week start reference:', thisWeekStart.toISOString());
    
    if (direction === 'prev' && currentDate < thisWeekStart) {
      setError("Cannot schedule for weeks in the past");
      return;
    }
    
    // Update week start date - using explicit formatting to avoid timezone issues
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    const newDateString = `${year}-${month}-${day}`;
    
    console.log('Setting new week start date:', newDateString);
    setWeekStartDate(newDateString);
  };
  
  // Helper function to format date nicely for display
  const formatDateForDisplay = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };
  
  // Calculate end date of the week (6 days after start date)
  const getWeekEndDate = (startDateString) => {
    const startDate = new Date(startDateString);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6); // Add 6 days to get to the end of week
    return endDate;
  };
  
  // Helper function to convert UI date to backend date - now just passes through the date
  // No need for adjustments as the backend handles the week calculation based on system settings
  const convertUiDateToBackendDate = (uiDateString) => {
    console.log('Date being sent to backend unchanged:', uiDateString);
    return uiDateString;
  };
  
  // Get the ordered days for visual display
  const orderedDaysForDisplay = getOrderedDaysForDisplay();
  
  // Helper function to check if a time slot is available for a specific day
  const isTimeSlotAvailable = (timeSlotId) => {
    if (!slotAvailability[timeSlotId]) {
      return true; // Default to available if we don't have data
    }
    
    // Get availability data
    return slotAvailability[timeSlotId].available;
  };

  // Helper function to get remaining capacity for a time slot
  const getTimeSlotCapacity = (timeSlotId) => {
    if (!slotAvailability[timeSlotId]) {
      return { current: 0, max: null }; // Default values if data not available
    }
    
    return {
      current: slotAvailability[timeSlotId].current || 0,
      max: slotAvailability[timeSlotId].max
    };
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!selectedEmployee) {
      setError('Please select an employee');
      return;
    }
    
    // Check if at least one day has a time slot selected
    const hasSelectedSlot = Object.values(selectedTimeSlots).some(slot => slot !== '');
    if (!hasSelectedSlot) {
      setError('Please select at least one time slot');
      return;
    }
    
    // Prepare time slot assignments
    const timeSlotAssignments = Object.entries(selectedTimeSlots)
      .filter(([_, slotId]) => slotId !== '')
      .map(([day, slotId]) => ({
        day_of_week: parseInt(day),
        time_slot_id: slotId
      }));
    
    try {
      setLoading(true);
      
      console.log('============ SUBMITTING WEEKLY SCHEDULE ============');
      console.log('Current weekStartDate:', weekStartDate);
      console.log('Employee ID:', selectedEmployee);
      console.log('First day of week setting:', systemSettings.first_day_of_week);
      console.log('Time slot assignments:', timeSlotAssignments);
      
      // MAJOR FIX: Use today's date (May 9), not the week start date (May 6)
      // Get the current date directly
      const currentDate = new Date();
      const todaysDate = currentDate.toISOString().split('T')[0];
      
      console.log('Using TODAY\'S DATE for submission:', todaysDate);
      console.log('NOT using week start date:', weekStartDate);
      
      // Use today's date - the backend will calculate the right week
      const requestData = {
        employee_id: selectedEmployee,
        week_start_date: todaysDate, // Using TODAY'S DATE (May 9)
        time_slot_assignments: timeSlotAssignments
      };
      
      console.log('Request payload with today\'s date:', requestData);
      
      // Get the token
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      // Make direct fetch request instead of using axios
      console.log('Sending request to /schedules/weekly endpoint with today\'s date');
      const response = await fetch('http://localhost:5000/api/schedules/weekly', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error data:', errorData);
        throw new Error(errorData.message || `Error: ${response.status}`);
      }
      
      const responseData = await response.json();
      console.log('Response data:', responseData);
      console.log('============ SCHEDULE SUBMISSION COMPLETE ============');
      
      setSuccess('Weekly schedule created successfully');
      setLoading(false);
      
      // Redirect to schedules list after a delay
      setTimeout(() => {
        navigate('/schedules');
      }, 2000);
      
    } catch (err) {
      console.error('Error submitting schedule:', err);
      setLoading(false);
      setError(err.message || 'Failed to create weekly schedule');
    }
  };
  
  return (
    <div className="schedule-form-container">
      <h2>Create Weekly Schedule</h2>
      
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="employeeSelect">Employee:</label>
          <select
            id="employeeSelect"
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
            disabled={(user && user.role !== 'admin') || loading}
          >
            <option value="">Select Employee</option>
            {employees.map(employee => (
              <option key={employee.id} value={employee.id}>
                {employee.name} - {employee.position}
              </option>
            ))}
          </select>
        </div>
        
        <div className="week-navigation">
          <button 
            type="button" 
            className="week-nav-button prev" 
            onClick={() => handleWeekChange('prev')}
          >
            ← Previous Week
          </button>
          
          <div className="week-info-banner">
            <div className="week-info-label">Selected Week:</div>
            <div className="week-info-value">
              {formatDateForDisplay(weekStartDate)} to {formatDateForDisplay(getWeekEndDate(weekStartDate))}
            </div>
          </div>
          
          <button 
            type="button" 
            className="week-nav-button next" 
            onClick={() => handleWeekChange('next')}
          >
            Next Week →
          </button>
        </div>
        
        {weekStartDate && (
          <div className="weekly-schedule-grid">
            <div className="schedule-header-actions" style={styles.scheduleHeaderActions}>
              <h3>
                Select Time Slots for Each Day
                {loadingAvailability && <span className="loading-indicator"> (Loading availability...)</span>}
              </h3>
              <button 
                type="button"
                style={{
                  ...styles.refreshButton,
                  ...(loadingAvailability ? styles.refreshButtonDisabled : {})
                }}
                onClick={() => {
                  console.log('============== SIMPLE DIRECT REFRESH ==============');
                  // Simply call the checkBatchAvailability function directly
                  // It will now use today's date (May 9) instead of the week start date (May 6)
                  checkBatchAvailability();
                  console.log('============== REFRESH INITIATED ==============');
                }}
                disabled={loadingAvailability}
              >
                {loadingAvailability ? 'Refreshing...' : 'Refresh Availability'}
              </button>
            </div>
            
            {orderedDaysForDisplay.map((dayInfo) => {
              const { name, value, displayIndex } = dayInfo; // value is the standard day number (0=Sun, 1=Mon, etc.)
              
              // Get the date for this day based on the day value
              const dayDate = getDateForDay(value);
              const isPastDay = disabledDays[displayIndex];
              
              return (
                <div key={value} className={`day-slot-container ${isPastDay ? 'past-day' : ''}`}>
                  <h4>
                    {name} <span className="day-number">({value})</span> - {formatDateForDisplay(dayDate)}
                    {isPastDay && <span className="past-day-indicator"> (Past)</span>}
                  </h4>
                  
                  <div className="time-slots-list">
                    {loadingAvailability && getTimeSlotsForDay(value).length > 0 ? (
                      <div className="loading-slots">Checking availability...</div>
                    ) : isPastDay ? (
                      <div className="past-day-message">Past day - cannot select</div>
                    ) : getTimeSlotsForDay(value).length > 0 ? (
                      getTimeSlotsForDay(value).map(slot => {
                        // Use the enhanced slot object properties directly
                        // Check if this specific time slot is in the past
                        const slotDate = getDateForDay(value);
                        const isSlotPast = isTimeSlotPast(slotDate, slot);
                        
                        return (
                          <div 
                            key={slot.id} 
                            className={`time-slot-item ${slot.isSelected ? 'selected' : ''} ${!slot.available ? 'fully-booked' : ''} ${isSlotPast ? 'past-slot' : ''}`}
                            onClick={() => !isSlotPast && !isPastDay && handleTimeSlotSelect(value, slot.isSelected ? '' : slot.id)}
                          >
                            <div className="time-slot-content">
                              <span className="time-range">
                                {slot.formatted}
                              </span>
                              
                              <span className={`availability-indicator ${!slot.available ? 'full' : 'available'}`}>
                                {slot.capacityInfo}
                              </span>
                              
                              {isSlotPast && <span className="past-indicator">(Past)</span>}
                            </div>
                            
                            {slot.name && <div className="time-slot-name">{slot.name}</div>}
                          </div>
                        );
                      })
                    ) : (
                      <p>No time slots available for this day</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        <div className="form-actions">
          <button 
            type="button" 
            className="cancel-button" 
            onClick={() => navigate('/schedules')}
            disabled={loading}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="submit-button" 
            disabled={loading || loadingAvailability}
          >
            {loading ? 'Creating...' : 'Create Weekly Schedule'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default WeeklyScheduleForm; 