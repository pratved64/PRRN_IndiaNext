import './globals.css';
import Link from 'next/link';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900">
        {/* Main Content Area */}
        <main className="min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}