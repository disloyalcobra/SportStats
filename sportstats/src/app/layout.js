import './globals.css';

export const metadata = {
  title: 'SportStats — Sistema de Estadísticas Deportivas',
  description: 'Plataforma integral para el registro, análisis y visualización de estadísticas de basketball universitario.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
