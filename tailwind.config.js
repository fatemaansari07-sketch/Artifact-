/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0B0D12",
        panel: "#12151C",
        panel2: "#181C25",
        line: "#242936",
        amber: "#F5A623",
        amber2: "#FFC864",
        ember: "#E4572E",
        mist: "#9AA3B2",
        bone: "#EDEFF3",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};
