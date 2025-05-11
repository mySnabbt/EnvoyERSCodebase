import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import './Departments.css';

const DepartmentForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;
  
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  
  const [loading, setLoading] = useState(isEditMode);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDepartment = async () => {
      if (isEditMode) {
        try {
          const response = await axios.get(`/departments/${id}`);
          console.log('Department data response:', response.data);
          
          if (response.data && response.data.data) {
            const departmentData = response.data.data;
            setFormData({
              name: departmentData.name || '',
              description: departmentData.description || ''
            });
          }
          setLoading(false);
        } catch (err) {
          console.error('Failed to fetch department:', err);
          setError('Failed to fetch department data. Please try again.');
          setLoading(false);
        }
      }
    };

    fetchDepartment();
  }, [id, isEditMode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    try {
      // Create the data object
      const departmentData = {
        name: formData.name,
        description: formData.description
      };
      
      console.log('Submitting department data:', departmentData);
      
      let response;
      if (isEditMode) {
        response = await axios.put(`/departments/${id}`, departmentData);
        console.log('Update response:', response.data);
      } else {
        response = await axios.post('/departments', departmentData);
        console.log('Create response:', response.data);
      }
      
      navigate('/departments');
    } catch (err) {
      console.error('Error saving department:', err.response?.data);
      setError(err.response?.data?.message || 'Failed to save department data. Please try again.');
    }
  };

  if (loading) return <div className="loading">Loading department data...</div>;

  return (
    <div className="department-form-container">
      <div className="department-detail-header">
        <h1>{isEditMode ? 'Edit Department' : 'Add New Department'}</h1>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="department-form">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Department Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="4"
            />
          </div>
          
          <div className="form-buttons">
            <Link to="/departments" className="cancel-button">Cancel</Link>
            <button type="submit" className="save-button">
              {isEditMode ? 'Update Department' : 'Add Department'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DepartmentForm; 