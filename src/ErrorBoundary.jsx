import React from "react";
export default class ErrorBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <main className="panel setup" role="alert">
          <h1>Let's try that again</h1>
          <p>
            The screen couldn't load. Your saved data is still in your account.
          </p>
          <button onClick={() => location.reload()}>Reload app</button>
        </main>
      );
    return this.props.children;
  }
}
