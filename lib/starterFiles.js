export const STARTER_FILES = {
  "/App.js": `export default function App() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "Inter, sans-serif",
      background: "#0B0D12",
      color: "#EDEFF3",
      textAlign: "center",
      padding: "24px",
    }}>
      <div style={{
        width: 10, height: 10, borderRadius: 999,
        background: "#F5A623", marginBottom: 20,
        boxShadow: "0 0 24px 4px #F5A62366",
      }} />
      <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>
        Bata kya banau
      </h1>
      <p style={{ color: "#9AA3B2", marginTop: 8, maxWidth: 380 }}>
        Left panel mein likh — jo bhi app ya website chahiye. Yahan live preview ban jayegi.
      </p>
    </div>
  );
}
`,
};

export const STARTER_DEPS = {};
