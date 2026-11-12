import Link from 'next/link';
import SiteFooter from '@/components/SiteFooter';
import { CORREO_SOPORTE } from '@/lib/contacto';

export const metadata = {
  title: 'Términos y condiciones y aviso de privacidad — SportStats',
  description: 'SportStats es un proyecto sin fines de lucro y de código abierto que no recopila datos personales más allá de lo necesario para tu cuenta.',
};

const ACTUALIZACION = '12 de noviembre de 2026';
const REPO = 'https://github.com/disloyalcobra/SportStats';

export default function TerminosPage() {
  return (
    <div className="legal-page">
      <header className="legal-header">
        <Link href="/" className="legal-brand">
          <span className="logo-icon">SS</span>
          <span>SportStats</span>
        </Link>
        <Link href="/" className="btn btn-ghost btn-sm">← Volver a la app</Link>
      </header>

      <main className="legal-body">
        <h1>Términos y condiciones y aviso de privacidad</h1>
        <p className="legal-updated">Última actualización: {ACTUALIZACION}</p>

        <div className="legal-highlights">
          <div><strong>Sin fines de lucro</strong><span>Gratuito, sin publicidad ni cobros.</span></div>
          <div><strong>Código abierto</strong><span>El código fuente es público.</span></div>
          <div><strong>Sin recopilación de datos personales</strong><span>Solo lo mínimo para tu cuenta. Sin rastreo.</span></div>
        </div>

        <nav className="legal-toc" aria-label="Contenido">
          <a href="#terminos">1. Términos y condiciones</a>
          <a href="#privacidad">2. Aviso de privacidad</a>
        </nav>

        {/* ===================== TÉRMINOS ===================== */}
        <section id="terminos">
          <h2>1. Términos y condiciones</h2>

          <h3>1.1 Naturaleza del proyecto</h3>
          <p>
            SportStats es una herramienta para registrar y analizar estadísticas deportivas de equipos, jugadores,
            partidos, temporadas y torneos. Es un proyecto <strong>sin fines de lucro</strong>: su uso es gratuito,
            no muestra publicidad, no ofrece planes de pago y no comercializa ningún tipo de información.
          </p>

          <h3>1.2 Código abierto y licencia</h3>
          <p>
            El código fuente es público y puede consultarse en{' '}
            <a href={REPO} target="_blank" rel="noopener noreferrer">{REPO.replace('https://', '')}</a>.
            Se distribuye bajo la licencia{' '}
            <a href="https://creativecommons.org/licenses/by-nc-nd/4.0/deed.es" target="_blank" rel="noopener noreferrer license">
              Creative Commons Atribución-NoComercial-SinDerivadas 4.0 Internacional (CC BY-NC-ND 4.0)
            </a>. Puedes copiarlo y compartirlo siempre que:
          </p>
          <ul>
            <li><strong>Atribución:</strong> reconozcas la autoría original (github.com/disloyalcobra).</li>
            <li><strong>No comercial:</strong> no lo uses con fines comerciales.</li>
            <li><strong>Sin derivadas:</strong> no distribuyas versiones modificadas.</li>
          </ul>

          <h3>1.3 Uso del servicio</h3>
          <ul>
            <li>Cada cuenta es personal. Eres responsable de mantener la confidencialidad de tu contraseña.</li>
            <li>
              Si olvidas tu contraseña, escribe a{' '}
              <a href={`mailto:${CORREO_SOPORTE}?subject=${encodeURIComponent('Recuperar cuenta SportStats')}`}>{CORREO_SOPORTE}</a>{' '}
              desde el correo con el que te registraste. Se te enviará una contraseña temporal; nunca se te pedirá
              tu contraseña actual.
            </li>
            <li>
              Eres responsable de la información que registras (nombres de jugadores, entrenadores, resultados, etc.)
              y de contar con la autorización de las personas involucradas, en especial cuando se trate de menores de edad.
            </li>
            <li>No está permitido usar la plataforma para actividades ilícitas ni para intentar acceder a datos de otras cuentas.</li>
          </ul>

          <h3>1.4 Sin garantías</h3>
          <p>
            SportStats se ofrece <strong>&quot;tal cual&quot;</strong>, sin garantías de disponibilidad continua ni de ausencia de
            errores. Al ser un proyecto sin fines de lucro, no se asume responsabilidad por pérdidas de información; te
            recomendamos exportar tus reportes en PDF para conservar un respaldo.
          </p>

          <h3>1.5 Cambios</h3>
          <p>
            Estos términos pueden actualizarse. La fecha de la última modificación aparece al inicio de esta página.
          </p>
        </section>

        {/* ===================== PRIVACIDAD ===================== */}
        <section id="privacidad">
          <h2>2. Aviso de privacidad</h2>

          <h3>2.1 Sin recopilación de datos personales</h3>
          <p>
            SportStats <strong>no recopila datos personales</strong> con fines comerciales, publicitarios, estadísticos
            ni de perfilado. No utiliza herramientas de analítica, cookies de rastreo, píxeles de terceros ni publicidad,
            y <strong>nunca vende, renta ni comparte</strong> información con terceros.
          </p>

          <h3>2.2 Lo único que se almacena</h3>
          <ul>
            <li>
              <strong>Datos de tu cuenta:</strong> nombre, correo electrónico y contraseña. La contraseña se guarda
              cifrada (hash <em>scrypt</em>) y nunca en texto plano. Se usan únicamente para que puedas iniciar sesión.
            </li>
            <li>
              <strong>Una cookie técnica de sesión</strong> (<code>ss_session</code>), indispensable para mantenerte
              conectado. Dura 7 días y se elimina al cerrar sesión. No se usa para rastrearte.
            </li>
            <li>
              <strong>La información deportiva que tú registras</strong> (equipos, jugadores, partidos, estadísticas).
              Es tuya, solo es visible para tu cuenta y ninguna otra cuenta puede consultarla.
            </li>
          </ul>

          <h3>2.3 Dónde se guarda</h3>
          <p>
            La información se aloja en la infraestructura necesaria para que la app funcione: la base de datos en Turso
            y la aplicación en Vercel. Estos proveedores solo almacenan y sirven los datos; no se les entrega información
            para otros fines.
          </p>

          <h3>2.4 Tus derechos</h3>
          <p>
            Puedes solicitar en cualquier momento el acceso, la corrección o la eliminación de tu cuenta y de toda tu
            información. Para hacerlo, escribe a{' '}
            <a href={`mailto:${CORREO_SOPORTE}`}>{CORREO_SOPORTE}</a>{' '}
            desde el correo de tu cuenta, o contacta al autor en{' '}
            <a href="https://github.com/disloyalcobra" target="_blank" rel="noopener noreferrer">github.com/disloyalcobra</a>.
            Nunca envíes tu contraseña por correo.
          </p>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
