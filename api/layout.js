import "./globals.css";

export const metadata = {
  title: "Forge — Describe it. Watch it build.",
  description: "AI app builder with live in-browser preview.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-ink text-bone font-body antialiased">{children}</body>
    </html>
  );
}
