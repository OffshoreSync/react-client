import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Home() {
  const [message, setMessage] = useState('');

  useEffect(() => {
    axios.get('http://localhost:5000/')
      .then(response => {
        setMessage(response.data);
      })
      .catch(error => {
        console.error('Error fetching data:', error);
        setMessage('Failed to connect to server');
      });
  }, []);

  return (
    <div>
      <h1>Welcome to Our MERN App</h1>
      <p>Server Message: {message}</p>
    </div>
  );
}

export default Home;
