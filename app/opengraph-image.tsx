import { ImageResponse } from "next/og";

export const alt = "skillZs Agent Skills Hub and Catalog";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: "#050505",
        color: "#f2eee4",
        display: "flex",
        height: "100%",
        justifyContent: "center",
        padding: "72px",
        width: "100%",
      }}
    >
      <div style={{ border: "8px solid #f2eee4", display: "flex", flexDirection: "column", padding: "52px 64px", width: "100%" }}>
        <div style={{ color: "#a78bfa", display: "flex", fontSize: 104, fontWeight: 900, letterSpacing: "-5px" }}>skillZs</div>
        <div style={{ display: "flex", fontSize: 54, fontWeight: 800, marginTop: "12px" }}>THE AGENT SKILLS HUB</div>
        <div style={{ color: "#d1c8b7", display: "flex", fontSize: 27, marginTop: "28px" }}>Discover, inspect, create, publish, and safely install Agent Skills.</div>
      </div>
    </div>,
    size,
  );
}
