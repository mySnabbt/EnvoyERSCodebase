import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext, useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { FaCheck } from 'react-icons/fa';
import './Schedules.css';

// Create an axios instance with the correct base URL
const api = axios.create({
  baseURL: `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api`,
  headers: {
    'Content-Type': 'application/json',
  }
});

const ScheduleForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // Use the useAuth hook instead of direct context access
  const { currentUser, isAdmin, token } = useAuth();
  
  // Configure auth token for API requests
  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    
    return () => {
      delete api.defaults.headers.common['Authorization'];
    };
  }, [token]);
  
  // Debug: Log the current user data
  useEffect(() => {
    console.log('Current user in ScheduleForm:', currentUser);
    if (!currentUser) {
      console.warn('No current user data available');
    } else if (!currentUser.id) {
      console.warn('Current user does not have an ID property:', currentUser);
    }
  }, [currentUser]);
  
  // For calculating the current week's start date
  function getCorrectWeekDate() {
    // Use the current system date - create fresh to avoid any cached dates
    const today = new Date();
    
    // Get the JS day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    const jsDayOfWeek = today.getDay(); 
    
    // Get firstDayOfWeek from system settings
    const firstDayOfWeek = systemSettings.first_day_of_week;
    
    // Calculate days to subtract to get to the first day of the week
    const daysToSubtract = (jsDayOfWeek - firstDayOfWeek + 7) % 7;
    
    // Create a new date object for the current week's first day
    const firstDay = new Date(today);
    firstDay.setDate(today.getDate() - daysToSubtract);
    
    // Reset time to start of day
    firstDay.setHours(0, 0, 0, 0);
    
    return firstDay;
  }
  
  // System settings
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [systemSettings, setSystemSettings] = useState({ first_day_of_week: 1 });
  
  // Standard day names array (0=Sunday, 1=Monday, etc.)
  const standardDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  // Fetch system settings first
  useEffect(() => {
    const fetchSystemSettings = async () => {
      try {
        const response = await axios.get('/settings');
        if (response.data && response.data.data) {
          setSystemSettings(response.data.data);
        }
        setSettingsLoaded(true);
      } catch (err) {
        console.error('Failed to fetch system settings:', err);
        // Default to standard first_day_of_week = 1 (Monday)
        setSettingsLoaded(true);
      }
    };
    
    fetchSystemSettings();
  }, []);
  
  // Update week start date when settings are loaded
  useEffect(() => {
    if (settingsLoaded) {
      // Force a fresh week date calculation
      const freshDate = getCorrectWeekDate();
      setWeekStartDate(freshDate);
    }
  }, [settingsLoaded, systemSettings.first_day_of_week]);
  
  // Get ordered day names based on the system settings first_day_of_week
  const getOrderedDays = useMemo(() => {
    const firstDayOfWeek = systemSettings.first_day_of_week;
    
    // Reorder days based on first_day_of_week
    const orderedDays = [];
    for (let i = 0; i < 7; i++) {
      const dayIndex = (i + firstDayOfWeek) % 7;
      orderedDays.push({
        name: standardDays[dayIndex],
        value: dayIndex, // This is the actual JavaScript day value (0=Sun, 1=Mon, etc.)
        displayIndex: i  // This is the display position (0=first day shown, 1=second day shown, etc.)
      });
    }
    
    return orderedDays;
  }, [systemSettings.first_day_of_week]);
  
  // Calculate current date's week start when initializing
  const calculateCurrentWeekStart = () => {
    const nowDate = new Date();
    const jsDay = nowDate.getDay();
    // Default to Sunday (0) if systemSettings isn't loaded yet
    const firstDayOfWeek = 0;
    const daysToSubtract = (jsDay - firstDayOfWeek + 7) % 7;
    
    const newWeekStart = new Date(nowDate);
    newWeekStart.setDate(nowDate.getDate() - daysToSubtract);
    newWeekStart.setHours(0, 0, 0, 0);
    
    return newWeekStart;
  };
  
  const [weekStartDate, setWeekStartDate] = useState(calculateCurrentWeekStart());
  const [notes, setNotes] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [error, setError] = useState('');
  const [selectedTimeSlots, setSelectedTimeSlots] = useState({});
  const [timeSlotAvailability, setTimeSlotAvailability] = useState({});
  const [timeSlots, setTimeSlots] = useState([]);
  const [availabilityData, setAvailabilityData] = useState({});
  const [employeeId, setEmployeeId] = useState(null);
  const [employeeData, setEmployeeData] = useState(null);
  const [allEmployees, setAllEmployees] = useState([]);
  
  // Format date for display
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  
  // Get the formatted week range (e.g., "Apr 12 - Apr 18, 2023")
  const formatWeekRange = () => {
    if (!correctDayMap || Object.keys(correctDayMap).length < 7) return '';
    
    const startDateInfo = correctDayMap[0];
    const endDateInfo = correctDayMap[6];
    
    if (!startDateInfo || !endDateInfo) return '';
    
    const year = startDateInfo.date.getFullYear();
    return `${startDateInfo.displayDate} - ${endDateInfo.displayDate}, ${year}`;
  };
  
  // Get the week dates starting from the specified week start date
  const weekDates = useMemo(() => {
    if (!weekStartDate || !settingsLoaded) return [];
    
    const dates = [];
    const startDate = new Date(weekStartDate);
    
    console.log('Week start date:', startDate.toISOString());
    console.log('First day of week setting:', systemSettings.first_day_of_week);
    console.log('Ordered days:', getOrderedDays);
    
    // Loop for 7 days starting from the weekStartDate
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      // Add debug info
      console.log(`Day ${i} (${getOrderedDays[i]?.name}):`, {
        date: date.toISOString(),
        formattedDate: date.toISOString().split('T')[0],
        jsDay: date.getDay(),
        displayIndex: i
      });
      
      dates.push(date);
    }
    
    return dates;
  }, [weekStartDate, getOrderedDays, settingsLoaded]);
  
  // FIX: This creates the correct date map that shows the actual calendar dates
  // This ensures both the UI and backend have the correct dates
  const correctDayMap = useMemo(() => {
    const result = {};
    
    if (!weekDates.length) return result;
    
    // Use the dynamic calculated week start date instead of a hardcoded reference date
    const startDate = new Date(weekStartDate);
    
    // Map each day index to its correct calendar date
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
  
      // Get the date without timezone issues
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      // Determine the day name
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = dayNames[date.getDay()];
      
      result[i] = {
        date: date,
        dateStr: dateStr, // This is the key format used by the backend
        displayName: dayName, // Use actual day name instead of getOrderedDays
        jsDay: date.getDay(),
        displayDate: `${date.toLocaleDateString('en-US', { month: 'short' })} ${date.getDate()}`
      };
      
      console.log(`Setting day ${i} (${dayName}) to date: ${dateStr}`);
    }
    
    console.log('Correct day mapping created:', result);
    
    return result;
  }, [weekStartDate, weekDates]);
  
  // Update the fetchAvailabilityData function to be more reliable
  const fetchAvailabilityData = useCallback((slots) => {
    if (!slots || slots.length === 0) return;
    
    setLoadingAvailability(true);
    setAvailabilityData({}); // Clear previous data
    
    // Get token from localStorage
    const token = localStorage.getItem('token');
    
    const timeSlotIds = slots.map(slot => slot.id);
    
    // FIXED: Always use today's date, not weekStartDate
    // Create a fresh Date object to ensure we're using the current date
    const currentDate = new Date();
    const todayStr = currentDate.toISOString().split('T')[0];
    
    console.log('====================== REQUESTING AVAILABILITY DATA ======================');
    console.log('Using today\'s date:', todayStr, '(instead of week start date)');
    console.log('Current browser time:', currentDate.toString());
    console.log('Time slot IDs:', timeSlotIds);
    
    const requestData = {
      date: todayStr,
      timeSlotIds: timeSlotIds
    };
    
    fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/time-slots/batch-availability`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    })
    .then(response => {
      console.log('Fetch response status:', response.status);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log('====================== AVAILABILITY RESPONSE ======================');
      console.log('Full availability data:', data);
      
      setLoadingAvailability(false);
      if (data && data.data) {
        console.log('Setting availability data to:', data.data);
        setAvailabilityData(data.data);
      } else {
        console.error('Invalid availability response format:', data);
      }
    })
    .catch(err => {
      setLoadingAvailability(false);
      console.error('Error fetching availability:', err);
      setError('Failed to load availability data. Please check your connection and try again.');
    });
  }, []);
  
  // Add a separate effect to refresh data when navigating back to the page
  useEffect(() => {
    console.log('Navigation or page refresh detected - updating availability data');
    
    // Only refresh if we have time slots already loaded
    if (timeSlots && timeSlots.length > 0) {
      fetchAvailabilityData(timeSlots);
    }
  }, [location.key, fetchAvailabilityData, timeSlots]);
  
  // Use effect to fetch time slots
  useEffect(() => {
    if (!settingsLoaded) return;
    
    setLoading(true);
    setError(null);
    
    // Get token from localStorage
    const token = localStorage.getItem('token');
    console.log('Using token from localStorage:', token);
    
    console.log('Fetching time slots using fetch API');
    
    // Use fetch API directly as a test
    fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/time-slots`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    .then(response => {
      console.log('Fetch response status:', response.status);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log('Time slots fetch response:', data);
      if (data && data.data) {
        setTimeSlots(data.data);
        // After getting time slots, fetch availability data using batch endpoint
        fetchAvailabilityData(data.data);
      } else {
        console.error('Invalid response format:', data);
        setError('Invalid time slots data format received from server');
      }
      setLoading(false);
    })
    .catch(err => {
      console.error('Error fetching time slots:', err);
      setError('Failed to load time slots. Please check your connection and try again.');
      setLoading(false);
    });
  }, [fetchAvailabilityData, settingsLoaded]);
  
  // Process time slots into a more usable format
  const timeSlotsByTime = useMemo(() => {
    const slotsByTime = {};
    
    timeSlots.forEach(slot => {
      const timeRange = `${slot.start_time} - ${slot.end_time}`;
      if (!slotsByTime[timeRange]) {
        slotsByTime[timeRange] = {};
      }
      
      // Map the database day_of_week to the display index
      const displayDay = getOrderedDays.findIndex(day => day.value === slot.day_of_week);
      if (displayDay !== -1) {
        slotsByTime[timeRange][displayDay] = slot;
      }
    });
    
    return slotsByTime;
  }, [timeSlots, getOrderedDays]);
  
  // Get all unique time ranges
  const timeRanges = useMemo(() => {
    return Object.keys(timeSlotsByTime).sort();
  }, [timeSlotsByTime]);
  
  // Get total number of selected slots
  const getTotalSelectedSlots = () => {
    return Object.values(selectedTimeSlots).reduce((total, slots) => total + slots.length, 0);
  };
  
  // Get availability count for a slot
  const getAvailabilityCount = (dayIndex, slotId) => {
    if (!slotId || !availabilityData[slotId]) {
      console.warn(`No availability data for slot ${slotId}`);
      return "0/∞";  // Default to unlimited if no data
    }
    
    const slotData = availabilityData[slotId];
    console.log(`Raw availability data for slot ${slotId}:`, slotData);
    
    // Make sure we have actual numbers
    const count = typeof slotData.count === 'number' ? slotData.count : 0;
    
    // Handle the case where maxEmployees is null (unlimited)
    if (slotData.maxEmployees === null) {
      return `${count}/∞`; // Show infinity symbol for unlimited slots
    }
    
    const max = typeof slotData.maxEmployees === 'number' ? slotData.maxEmployees : 2;
    
    // Show actual count from API
    return `${count}/${max}`;
  };
  
  // Add auto-refresh timer to periodically update availability data
  useEffect(() => {
    console.log('Setting up availability data refresh timer');
    
    // Only set up the timer if we have time slots loaded
    if (timeSlots.length === 0) return;
    
    // Refresh data immediately on first load
    fetchAvailabilityData(timeSlots);
    
    // Set up an interval to refresh data every 2 minutes instead of 30 seconds
    // This will reduce the number of server logs while still keeping data updated
    const refreshInterval = setInterval(() => {
      console.log('Auto-refreshing availability data...');
      fetchAvailabilityData(timeSlots);
    }, 120000); // 2 minutes
    
    // Clean up the interval when the component unmounts
    return () => {
      console.log('Clearing availability refresh timer');
      clearInterval(refreshInterval);
    };
  }, [timeSlots, fetchAvailabilityData]);
    
  // Use effect to fetch employee data
  useEffect(() => {
    const fetchEmployeeRecord = async () => {
      if (!currentUser) {
        console.log('No current user data available, cannot fetch employee record');
        return;
      }
      
      console.log('Fetching employee record for user:', currentUser.id);
      
      try {
        const token = localStorage.getItem('token');
        
        if (!token) {
          console.error('No authentication token found');
          setError('Authentication token not found. Please log in again.');
          return;
        }
        
        console.log('Using token to fetch employee record:', token.substring(0, 10) + '...');
  
        // Fetch the employee record for the current user with better error handling
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/employees/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('Employee API response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`HTTP error! Status: ${response.status}, Body:`, errorText);
          throw new Error(`API error (${response.status}): ${errorText}`);
        }
        
        const data = await response.json();
        console.log('Employee data response:', data);
        
        if (data && data.success && data.data) {
          console.log('Setting employee ID to:', data.data.id);
          setEmployeeId(data.data.id);
          setEmployeeData(data.data);
        } else {
          console.error('API returned success but no employee data');
          setError('Could not find your employee record');
        }
      } catch (err) {
        console.error('Error fetching employee record:', err);
        setError('Failed to load your employee information: ' + err.message);
      }
    };
    
    fetchEmployeeRecord();
  }, [currentUser]);
  
  // Fetch all employees for admin to select from
  useEffect(() => {
    const fetchAllEmployees = async () => {
      // Only fetch all employees if user is admin
      if (!isAdmin) return;
      
      try {
        const token = localStorage.getItem('token');
        
        if (!token) {
          console.error('No authentication token found');
          return;
        }
        
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/employees`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`HTTP error! Status: ${response.status}, Body:`, errorText);
          throw new Error(`API error (${response.status}): ${errorText}`);
        }
        
        const data = await response.json();
        
        if (data && data.success && data.data) {
          console.log('Fetched all employees:', data.data.length);
          setAllEmployees(data.data);
        }
      } catch (err) {
        console.error('Error fetching all employees:', err);
      }
    };
    
    fetchAllEmployees();
  }, [isAdmin]);
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!employeeId) {
      setError('Cannot submit without an employee record');
      return;
    }
    
    if (Object.keys(selectedTimeSlots).length === 0) {
      setError('Please select at least one time slot');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      console.log('Using authentication token for submission:', token ? token.substring(0, 10) + '...' : 'No token');
      
      // Format the data for API
      const formattedTimeSlots = [];
      
      // Log selected time slots for debugging
      console.log('Raw selected time slots:', selectedTimeSlots);
      console.log('Correct day mapping:', correctDayMap);
      
      // Process each selected day and its slots
      Object.entries(selectedTimeSlots).forEach(([dayIndex, slotIds]) => {
        // Get the correct date info for this day
        const dayIndexNum = parseInt(dayIndex);
        const dateInfo = correctDayMap[dayIndexNum];
        
        if (!dateInfo) {
          console.error(`Could not find date info for day index ${dayIndex} in correctDayMap`);
          return; // Skip this day
        }
        
        // Debug log to show exactly what date is being used
        console.log(`===== DEBUG: SELECTED DATE PROCESSING =====`);
        console.log(`Day index: ${dayIndex}`);
        console.log(`Day name: ${dateInfo.displayName}`);
        console.log(`Actual calendar date: ${dateInfo.dateStr}`);
        console.log(`JS day of week: ${dateInfo.jsDay}`);
        console.log(`===== END DEBUG =====`);
        
        slotIds.forEach(slotId => {
          formattedTimeSlots.push({
            day_of_week: dayIndexNum, // Position in week (0-6)
            time_slot_id: slotId,
            actual_date: dateInfo.dateStr // The correct calendar date
          });
        });
      });
      
      // Use the actual first day of the week from correctDayMap
      const actualWeekStartDate = correctDayMap[0]?.dateStr || weekStartDate.toISOString().split('T')[0];
      
      console.log('Submitting schedule with week start date:', actualWeekStartDate);
      console.log('Time slot assignments:', formattedTimeSlots);
      
      const requestData = {
        employee_id: employeeId,
        week_start_date: actualWeekStartDate,
        time_slot_assignments: formattedTimeSlots,
        notes: notes
      };
      
      console.log('Submitting schedule request with data:', requestData);
      
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/schedules/weekly`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
          body: JSON.stringify(requestData)
        });
        
      // Better error handling to diagnose issues
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        let errorData;
        
        if (contentType && contentType.includes('application/json')) {
          errorData = await response.json();
          console.error('Error response JSON:', errorData);
          throw new Error(errorData.message || 'Failed to submit schedule request');
        } else {
          // Handle non-JSON responses like HTML error pages
          const errorText = await response.text();
          console.error('Error response text:', errorText);
          throw new Error(`API returned non-JSON response (${response.status})`);
        }
        }
        
        const data = await response.json();
        
        if (data && data.success) {
          setSuccessMessage('Schedule request submitted successfully!');
        // Redirect after a delay
        setTimeout(() => {
          navigate('/schedules');
        }, 2000);
        } else {
        setError(data.message || 'Failed to submit schedule request');
        }
    } catch (err) {
      console.error('Error submitting schedule request:', err);
      setError(err.message || 'Failed to submit schedule request');
    } finally {
      setLoading(false);
    }
  };
  
  // Check if a date and time slot is in the past
  const isPast = (date, timeSlot) => {
    const now = new Date(); // Current date and time
    
    // Create a clean compareDate object from the provided date
    const compareDate = new Date(date);
    
    // Check if the day is in the past
    if (compareDate.getFullYear() < now.getFullYear() ||
        (compareDate.getFullYear() === now.getFullYear() && compareDate.getMonth() < now.getMonth()) ||
        (compareDate.getFullYear() === now.getFullYear() && compareDate.getMonth() === now.getMonth() && 
         compareDate.getDate() < now.getDate())) {
      return true; // Definitely in the past if the date is before today
    }
    
    // If it's today, check the time
    if (compareDate.getFullYear() === now.getFullYear() && 
        compareDate.getMonth() === now.getMonth() && 
        compareDate.getDate() === now.getDate() && 
        timeSlot) {
      
      // Parse the start time from the time slot
      const [hours, minutes] = timeSlot.start_time.split(':').map(Number);
      
      // Create date object for the time slot's start time today
      const slotStartTime = new Date();
      slotStartTime.setHours(hours, minutes, 0, 0);
      
      // If current time is past the slot start time, consider it as past
      return now >= slotStartTime;
    }
    
    return false; // Not in the past
  };
  
  // Helper function to get slot availability
  const getSlotAvailability = (dateStr, slotId) => {
    if (!slotId || !availabilityData[slotId]) {
      return { isAtCapacity: false, remainingCapacity: 0, totalCapacity: 0 };
    }
    
    const slotData = availabilityData[slotId];
    return {
      isAtCapacity: !slotData.available,
      remainingCapacity: slotData.maxEmployees - slotData.count,
      totalCapacity: slotData.maxEmployees
    };
  };
  
  // Format date as DD/MM
  const formatDateShort = (date) => {
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
  };
  
  // Handle slot selection
  const handleSlotSelection = (dayIndex, slotId) => {
    // Log date information for debugging
    const selectedDateInfo = correctDayMap[dayIndex];
    
    console.log(`Selecting slot for day:`, {
      dayIndex: dayIndex,
      dateStr: selectedDateInfo.dateStr,
      displayName: selectedDateInfo.displayName,
      slotId: slotId
    });
    
    setSelectedTimeSlots(prev => {
      const newSelectedSlots = {...prev};
      
      if (!newSelectedSlots[dayIndex]) {
        newSelectedSlots[dayIndex] = [];
      }
      
      const index = newSelectedSlots[dayIndex].indexOf(slotId);
      if (index === -1) {
        newSelectedSlots[dayIndex] = [...newSelectedSlots[dayIndex], slotId];
      } else {
        newSelectedSlots[dayIndex] = [
          ...newSelectedSlots[dayIndex].slice(0, index),
          ...newSelectedSlots[dayIndex].slice(index + 1)
        ];
        
        // Clean up empty arrays
        if (newSelectedSlots[dayIndex].length === 0) {
          delete newSelectedSlots[dayIndex];
        }
      }
      
      return newSelectedSlots;
    });
  };
  
  // Check if a slot is selected
  const isSlotSelected = (dayIndex, slotId) => {
    return selectedTimeSlots[dayIndex] && selectedTimeSlots[dayIndex].includes(slotId);
  };
  
  // Check if a slot is at capacity
  const isSlotAtCapacity = (dayIndex, slotId) => {
    if (!slotId || !availabilityData[slotId]) {
      console.log(`No availability data for slot ${slotId} - assuming not at capacity`);
      return false;
    }
    
    const slotData = availabilityData[slotId];
    console.log(`Checking capacity for slot ${slotId}:`, slotData);
    
    // If available is explicitly false, then it's at capacity
    if (slotData.available === false) {
      console.log(`Slot ${slotId} is marked as not available (at capacity)`);
      return true;
    }
    
    // If we have numeric information about count and maxEmployees, use that
    if (typeof slotData.count === 'number' && typeof slotData.maxEmployees === 'number') {
      const atCapacity = slotData.count >= slotData.maxEmployees;
      console.log(`Slot ${slotId} has ${slotData.count}/${slotData.maxEmployees} slots filled, at capacity: ${atCapacity}`);
      return atCapacity;
    }
    
    // Default to not at capacity if we can't determine
    console.log(`Unable to determine capacity for slot ${slotId} - assuming not at capacity`);
    return false;
  };
  
  // Add a manual refresh function
  const forceRefreshAvailability = () => {
    console.log('Manually refreshing availability data...');
    if (timeSlots && timeSlots.length > 0) {
      fetchAvailabilityData(timeSlots);
    }
  };
  
  // Add an effect to force refresh data on initial load
  useEffect(() => {
    console.log('Initial load - force refreshing availability data');
    // Short delay to ensure all data is loaded first
    const refreshTimer = setTimeout(() => {
      if (timeSlots && timeSlots.length > 0) {
        fetchAvailabilityData(timeSlots);
      }
    }, 1000);
    
    return () => clearTimeout(refreshTimer);
  }, [timeSlots, fetchAvailabilityData]);
  
  // Handle employee selection change
  const handleEmployeeChange = (e) => {
    const selectedId = e.target.value;
    setEmployeeId(selectedId);
    
    // Find the selected employee's data
    const selectedEmployee = allEmployees.find(emp => emp.id === selectedId);
    if (selectedEmployee) {
      setEmployeeData(selectedEmployee);
    }
  };
  
  // Render the form
  return (
    <div className="schedule-form-container">
      <h2>Weekly Schedule Request</h2>
      
      {loading && <div className="loading">Loading schedule data...</div>}
      
      {error && <div className="error-message">{error}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}
      {!employeeId && !loading && !error && (
        <div className="warning-message">
          Loading your employee record... If this message persists, your user account may not be linked to an employee record.
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        {/* Employee Information Section */}
        <div className="form-section">
          <h3>Schedule Information</h3>
          
          {isAdmin && (
            <div className="form-group">
              <label htmlFor="employee">Select Employee:</label>
              <select 
                id="employee"
                value={employeeId || ''}
                onChange={handleEmployeeChange}
              >
                <option value="">Select an employee</option>
                {allEmployees.map(employee => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name} ({employee.position})
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {!isAdmin && employeeData && (
            <div className="employee-info">
              <p><strong>Name:</strong> {employeeData.name}</p>
              <p><strong>Position:</strong> {employeeData.position}</p>
            </div>
          )}
          
          <div className="week-display">
            <strong>Week of:</strong> {formatWeekRange()}
            <div style={{ fontSize: '0.85em', color: '#666', marginTop: '5px' }}>
              <em>Note: Hover over a day to see the exact date. Days in the past cannot be selected.</em>
            </div>
          </div>
        </div>
        
        {/* Schedule Table Section */}
        <div className="form-section">
          <h3>Select Time Slots</h3>
          <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'flex-end' }}>
            <button 
              type="button"
              onClick={forceRefreshAvailability}
              style={{
                padding: '5px 10px',
                background: '#f0f0f0',
                border: '1px solid #ccc',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Refresh Availability
            </button>
          </div>
          {!loading && settingsLoaded && weekDates.length > 0 && (
            <div className="schedule-table-container">
              <table className="schedule-table">
                <thead>
                  <tr>
                    <th style={{ width: '150px' }}>Time</th>
                    {Object.values(correctDayMap).map((dayInfo, index) => (
                      <th key={index} style={{ width: '120px' }}>
                        {dayInfo.displayName} 
                        <br />
                        <span style={{ fontSize: '0.9em' }}>
                          {dayInfo.displayDate}
                        </span>
                        <br />
                        <span style={{ fontSize: '0.8em', color: '#666' }}>
                          ({dayInfo.dateStr})
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {timeRanges.map(timeRange => (
                    <tr key={timeRange}>
                      <td className="time-cell">{timeRange}</td>
                      {Object.keys(correctDayMap).map(dayIndex => {
                        const numDayIndex = parseInt(dayIndex);
                        const dayInfo = correctDayMap[numDayIndex];
                        const slot = timeSlotsByTime[timeRange]?.[numDayIndex];
                        const slotId = slot?.id;
                        const isSelected = slot ? isSlotSelected(numDayIndex, slotId) : false;
                        
                        // Use the actual date from correctDayMap and check specific time slot
                        const pastDay = dayInfo && dayInfo.date && slot ? isPast(dayInfo.date, slot) : false;
                        
                        const isFullyBooked = slot ? isSlotAtCapacity(numDayIndex, slotId) : false;
                        
                        // Debug logging to check date comparison
                        if (dayInfo && dayInfo.date) {
                          console.log(`Checking day ${numDayIndex} (${dayInfo.displayName}) - Date: ${dayInfo.dateStr} - isPast: ${pastDay}`);
                        }
                        
                        return (
                          <td 
                            key={numDayIndex}
                            className={`slot-cell ${isSelected ? 'selected' : ''} ${pastDay ? 'past' : ''} ${isFullyBooked ? 'fully-booked' : ''}`}
                            onClick={() => {
                              if (slot && !pastDay && !isFullyBooked) {
                                handleSlotSelection(numDayIndex, slotId);
                              }
                            }}
                            style={{
                              backgroundColor: isSelected ? '#e6f7e6' : '#f8f8f8',
                              cursor: (slot && !pastDay && !isFullyBooked) ? 'pointer' : 'default',
                              position: 'relative',
                              padding: '10px',
                              textAlign: 'center',
                              border: isSelected ? '1px solid #4CAF50' : '1px solid #ddd'
                            }}
                            title={`${dayInfo.displayName}, ${dayInfo.dateStr}`}
                          >
                            {slot ? (
                              <>
                                {pastDay && <div className="past-indicator">Past</div>}
                                {isFullyBooked && <div className="capacity-indicator">Full</div>}
                                {isSelected && (
                                  <div style={{
                                    color: '#4CAF50',
                                    fontWeight: 'bold',
                                    fontSize: '16px'
                                  }}>✓</div>
                                )}
                                {!isSelected && !pastDay && !isFullyBooked && (
                                  <div className="availability-text">
                                    {getAvailabilityCount(numDayIndex, slotId)}
                                  </div>
                                )}
                              </>
                            ) : (
                              <span className="no-slot">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          <div className="schedule-legend">
            <div className="legend-item">
              <div className="legend-color selected"></div>
              <span>Selected</span>
            </div>
            <div className="legend-item">
              <div className="legend-color fully-booked"></div>
              <span>Fully Booked</span>
            </div>
            <div className="legend-item">
              <div className="legend-color past"></div>
              <span>Past Day</span>
            </div>
          </div>
          
          <div className="slots-selected">
            <strong>Time Slots Selected:</strong> {getTotalSelectedSlots()}
          </div>
          
          <div style={{ marginTop: '10px', fontSize: '0.9em', color: '#666' }}>
            <p>
              <strong>About Availability:</strong> The numbers (e.g., "1/3") show the total number of approved schedules for each time slot across all dates.
              Each time slot has its own capacity limit, and the same counts are shown for all days of the week.
              If counts are not updating after approval, click the "Refresh Availability" button above.
            </p>
          </div>
        </div>
        
        {/* Notes Section */}
        <div className="form-section">
          <h3>Additional Notes</h3>
          <div className="form-group">
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes or requests here..."
              rows={4}
            ></textarea>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="form-actions">
          <button type="button" className="cancel-btn" onClick={() => navigate('/schedules')}>
            Cancel
          </button>
          <button 
            type="submit" 
            className="submit-btn" 
            disabled={loading || !employeeId}
          >
            {loading ? 'Submitting...' : !employeeId ? 'Loading Employee Info...' : 'Submit Schedule Request'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ScheduleForm; 