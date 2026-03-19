import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "../components/Navbar";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "DiaRisk AI - Diabetes Risk Assessment",
  description: "AI-powered medical screening and diabetes risk assessment tool.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen relative flex flex-col bg-white font-sans selection:bg-slate-200 selection:text-slate-900">
            <Navbar />
            <main className="flex-1 relative z-10">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
