const supabase = require('../config/supabase');
const crypto = require('crypto');

class PasswordResetModel {
  static async createResetToken(userId) {
    // Generate a random token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Set expiration time (1 hour from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);
    
    // Store token in database
    const { data, error } = await supabase
      .from('password_reset_tokens')
      .insert({
        user_id: userId,
        token,
        expires_at: expiresAt.toISOString(),
        used: false
      });
      
    if (error) {
      console.error('Error creating reset token:', error);
      throw new Error('Failed to create password reset token');
    }
    
    return token;
  }
  
  static async validateToken(token) {
    // Get token from database
    console.log('Looking up token in database:', token.substring(0, 10) + '...');
    
    try {
      const { data, error } = await supabase
        .from('password_reset_tokens')
        .select('*')
        .eq('token', token)
        .eq('used', false)
        .single();
        
      if (error) {
        console.error('Error querying token from database:', error);
        return null;
      }
      
      if (!data) {
        console.log('Token not found in database or already used');
        return null;
      }
      
      console.log('Token found in database:', data.id);
      
      // Check if token is expired
      const now = new Date();
      const expiresAt = new Date(data.expires_at);
      
      if (now > expiresAt) {
        console.log('Token has expired. Expiry:', expiresAt, 'Current time:', now);
        return null;
      }
      
      console.log('Token is valid and not expired');
      return data;
    } catch (err) {
      console.error('Unexpected error validating token:', err);
      return null;
    }
  }
  
  static async markTokenAsUsed(tokenId) {
    const { data, error } = await supabase
      .from('password_reset_tokens')
      .update({ used: true })
      .eq('id', tokenId);
      
    if (error) {
      console.error('Error marking token as used:', error);
      throw new Error('Failed to update token status');
    }
    
    return true;
  }
}

module.exports = PasswordResetModel; 