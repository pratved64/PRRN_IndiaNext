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

            {/* Global CyberBot Overlay */}
            {/* Placed here so it floats above all pages and retains access to Language/Theme contexts */}
            <CyberBot />

          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}