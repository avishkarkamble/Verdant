export const metadata = { title: 'Verdant & Co Support' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#f4f6f4', color: '#1d2a1d' }}>
        {children}
      </body>
    </html>
  );
}
