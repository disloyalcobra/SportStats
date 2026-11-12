import Link from 'next/link';
import Image from 'next/image';

/** Pie de página con avisos legales, licencia y créditos. `variant="dark"` para fondos oscuros (login/registro). */
export default function SiteFooter({ variant = 'light' }) {
  return (
    <footer className={`site-footer${variant === 'dark' ? ' site-footer-dark' : ''}`}>
      <div className="site-footer-links">
        <Link href="/terminos#terminos">Términos y condiciones</Link>
        <span aria-hidden="true">·</span>
        <Link href="/terminos#privacidad">Aviso de privacidad</Link>
      </div>

      <p className="site-footer-text">
        Proyecto sin fines de lucro · Código abierto · No recopilamos datos personales más allá de tu cuenta
      </p>

      <div className="site-footer-badges">
        <a href="https://creativecommons.org/licenses/by-nc-nd/4.0/deed.es" target="_blank" rel="noopener noreferrer license"
          title="Licencia Creative Commons Atribución-NoComercial-SinDerivadas 4.0">
          <Image src="/cc-by-nc-nd.png" alt="Licencia Creative Commons BY-NC-ND 4.0" width={66} height={23} />
        </a>
        <Image src="/umad-logo.png" alt="Universidad Madero" width={61} height={26} />
      </div>

      <p className="site-footer-credit">
        Creado por{' '}
        <a href="https://github.com/disloyalcobra" target="_blank" rel="noopener noreferrer">github.com/disloyalcobra</a>
      </p>
    </footer>
  );
}
