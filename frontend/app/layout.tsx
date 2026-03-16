import './globals.css';
import { LanguageProvider } from '@/lib/i18n/LanguageContext';
import { ThemeProvider } from '@/lib/ThemeContext';
import CyberBot from '@/components/CyberBot'; // <-- 1. Import the Tactical Assistant

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900">
        <ThemeProvider>
          <LanguageProvider>
            
            {/* Main Content Area */}
            <main className="min-h-screen">
              {children}
            </main>

            {/* Ghost Node Trap for Scrapers/Bots */}
            {/* INVISIBLE TO HUMANS - DO NOT REMOVE */}
            <a 
              href="/api/system-telemetry-trap" 
              style={{ position: 'absolute', left: '-9999px', top: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }}
              aria-hidden="true"
              rel="nofollow"
            >
              System Configuration Telemetry
            </a>

            {/* Global CyberBot Overlay */}
            {/* Placed here so it floats above all pages and retains access to Language/Theme contexts */}
            <CyberBot />

          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}