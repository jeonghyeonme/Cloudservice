import React, { useState } from 'react';
import logo from '../assets/logo.svg';
import './App.css';
import Onboarding from '../components/Onboarding/Onboarding';

function App() {
  // Temporary state to toggle between Onboarding and Home screens
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  if (!isLoggedIn) {
    return <Onboarding />;
  }

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/pages/App.js</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
}

export default App;
