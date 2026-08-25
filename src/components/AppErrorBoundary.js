import React from 'react';

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, details) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('EDG interface error', error, details);
    }
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="app-error" role="alert">
        <p>ENGINEERING DRAWING</p>
        <h1>This page could not be displayed.</h1>
        <span>Your saved project remains in this browser.</span>
        <button type="button" onClick={() => window.location.assign('/')}>Return to the homepage</button>
      </main>
    );
  }
}
