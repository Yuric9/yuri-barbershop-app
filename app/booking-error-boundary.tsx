"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { failed: boolean };

export default class BookingErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("booking-central-error", error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <section className="mobile-booking-app booking-commerce-app booking-hub-v2">
        <div className="booking-central-error" role="alert">
          <strong>A Central encontrou um erro inesperado.</strong>
          <p>O restante do aplicativo continua disponível. Recarregue esta tela para tentar novamente.</p>
          <button type="button" onClick={() => window.location.reload()}>Recarregar Central</button>
        </div>
      </section>
    );
  }
}
