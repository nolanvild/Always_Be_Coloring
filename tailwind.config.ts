import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        purple: {
          brand: "#7F77DD",
          light: "#EEEDFE",
          mid: "#AFA9EC",
          dark: "#534AB7",
          darker: "#3C3489"
        },
        teal: {
          brand: "#1D9E75",
          light: "#E1F5EE",
          mid: "#9FE1CB",
          dark: "#085041"
        },
        coral: {
          brand: "#D85A30",
          light: "#FAECE7"
        },
        amber: {
          brand: "#EF9F27",
          light: "#FAEEDA"
        }
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"]
      },
      borderRadius: {
        brand: "8px"
      },
      boxShadow: {
        soft: "0 12px 32px rgba(127, 119, 221, 0.12)"
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" }
        }
      },
      animation: {
        shimmer: "shimmer 1.4s ease-in-out infinite"
      }
    }
  },
  plugins: []
};

export default config;
