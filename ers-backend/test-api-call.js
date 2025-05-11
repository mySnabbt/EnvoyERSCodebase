require('dotenv').config();
const axios = require('axios');
const supabase = require('./src/config/supabase');

// First get a valid auth token
async function getAuthToken() {
  // Use direct database query to get a user
  const { data: users, error } = await supabase
    .from('users')
    .select('id, email')
    .eq('role', 'admin')
    .limit(1);
    
  if (error || !users.length) {
    console.error('Error getting admin user:', error);
    return null;
  }
  
  // If we're running in a backend script, we need to generate a token
  // This is just for testing and debugging purposes
  const jwt = require('jsonwebtoken');
  const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key';
  
  const user = users[0];
  const payload = {
    user_id: user.id,
    email: user.email,
    role: 'admin'
  };
  
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
  console.log(`Generated test token for user: ${user.email}`);
  return token;
}

async function testApiAvailability() {
  console.log('Testing API batch availability endpoint for May 4th, 2025...');
  
  const token = await getAuthToken();
  if (!token) {
    console.error('Failed to get auth token for testing');
    return;
  }
  
  // Get time slot IDs
  const { data: timeSlots, error: tsError } = await supabase
    .from('time_slots')
    .select('id, day_of_week, start_time, end_time')
    .order('id');
  
  if (tsError) {
    console.error('Error fetching time slots:', tsError);
    return;
  }
  
  const timeSlotIds = timeSlots.map(slot => slot.id);
  
  // Make the API call
  try {
    const response = await axios.post('http://localhost:5000/api/time-slots/batch-availability', 
      {
        date: '2025-05-04',
        timeSlotIds: timeSlotIds
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('API Response:', response.data);
  } catch (error) {
    console.error('API call failed:', error.response?.data || error.message);
  }
}

testApiAvailability().catch(console.error); 