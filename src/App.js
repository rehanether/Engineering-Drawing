import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './components/Home';
import ProjectOverview from './components/ProjectOverview';
import Tokenomics from './components/Tokenomics';
import EducationFoundation from './components/EducationFoundation';
import Contact from './components/Contact';
import Presale from './components/Presale';
import './App.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error caught by ErrorBoundary:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div>
          <h1>Something went wrong. Please try refreshing the page.</h1>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
          <button onClick={() => window.location.reload()}>Reload Page</button>
        </div>
      );
    }

    return this.props.children;
  }
}

const App = () => {
  return (
    <Router>
      <ErrorBoundary>
        <div>
          <Header />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/project-overview" element={<ProjectOverview />} />
            <Route path="/tokenomics" element={<Tokenomics />} />
            <Route path="/presale" element={<Presale />} />
            <Route path="/education-foundation" element={<EducationFoundation />} />
            <Route path="/contact" element={<Contact />} />
          </Routes>
          <Footer />
        </div>
      </ErrorBoundary>
    </Router>
  );
};

export default App;
