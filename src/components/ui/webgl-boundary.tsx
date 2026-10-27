"use client";

import { Component, createRef, type ReactNode } from "react";

/** Keep the rest of the page usable if a GPU is unavailable or its context is lost. */
export class WebGLBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { status: "checking" | "ready" | "unavailable" }
> {
  state: { status: "checking" | "ready" | "unavailable" } = { status: "checking" };
  private container = createRef<HTMLDivElement>();

  static getDerivedStateFromError() {
    return { status: "unavailable" as const };
  }

  componentDidMount() {
    this.container.current?.addEventListener("webglcontextlost", this.onContextLost, true);
    // Three.js requires WebGL2. Run this only after hydration so server/client HTML match.
    let supported = false;
    try {
      const context = document.createElement("canvas").getContext("webgl2");
      supported = Boolean(context);
      context?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch {
      // Browsers can throw when graphics are disabled by policy or a driver failure.
    }
    this.setState({ status: supported ? "ready" : "unavailable" });
  }

  componentWillUnmount() {
    this.container.current?.removeEventListener("webglcontextlost", this.onContextLost, true);
  }

  private onContextLost = (event: Event) => {
    event.preventDefault();
    this.setState({ status: "unavailable" });
  };

  render() {
    return (
      <div ref={this.container} style={{ width: "100%", height: "100%" }}>
        {this.state.status === "ready" ? this.props.children : this.props.fallback}
      </div>
    );
  }
}
