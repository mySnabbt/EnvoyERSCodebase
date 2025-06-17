const supabase = require('../../config/supabase');

class SqlExecutionService {
  /**
   * Validates that a SQL query is read-only (SELECT only)
   * @param {string} query The SQL query to validate
   * @returns {boolean} True if the query is read-only, false otherwise
   */
  static isReadOnlyQuery(query) {
    if (!query || typeof query !== 'string') return false;
    
    // Trim and normalize the query
    const normalizedQuery = query.trim().toLowerCase();
    
    // Check if it starts with SELECT or WITH (for CTEs)
    const isSelectQuery = normalizedQuery.startsWith('select ') || normalizedQuery.startsWith('with ');
    
    // Check for any forbidden statements
    const hasForbiddenStatement = [
      'insert ', 
      'update ', 
      'delete ', 
      'drop ', 
      'create ', 
      'alter ', 
      'truncate ', 
      'grant ', 
      'revoke ',
      'commit ',
      'rollback '
    ].some(statement => normalizedQuery.includes(statement));
    
    return isSelectQuery && !hasForbiddenStatement;
  }

  /**
   * Execute a read-only SQL query with validation
   * @param {string} query The SQL query to execute
   * @param {string} userId The ID of the user executing the query
   * @param {string} userRole The role of the user executing the query
   * @returns {Promise<Object>} The query results and metadata
   */
  static async executeReadOnlyQuery(query, userId, userRole) {
    // Check if user is admin
    if (userRole !== 'admin') {
      throw new Error('Only admin users can execute SQL queries');
    }
    
    // Validate that the query is read-only
    if (!this.isReadOnlyQuery(query)) {
      throw new Error('Only read-only (SELECT) queries are allowed');
    }
    
    try {
      // Log the query execution for auditing
      console.log(`[SQL AUDIT] User ${userId} (${userRole}) executed: ${query}`);
      
      // Execute the query using Supabase
      const { data, error, count } = await supabase.rpc('execute_read_only_query', { 
        query_text: query 
      });
      
      if (error) throw error;
      
      // Return the results with metadata
      return {
        success: true,
        data,
        count,
        query,
        executed_at: new Date().toISOString(),
        executed_by: userId
      };
    } catch (error) {
      console.error('[SQL ERROR]', error);
      return {
        success: false,
        error: error.message,
        query
      };
    }
  }
}

module.exports = SqlExecutionService; 