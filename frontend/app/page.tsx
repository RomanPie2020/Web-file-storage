import Link from 'next/link';
import styles from './landing.module.css';
import { AuthErrorNotice } from './auth-error-notice';

export default function Home() {
  return (
    <main className={styles.page}>
      <AuthErrorNotice />
      <nav className={styles.nav}>
        <Link className={styles.brand} href="/">
          Acme<span>Data Room</span>
        </Link>
        <div className={styles.actions}>
          <Link className={styles.textLink} href="/signin">
            Sign in
          </Link>
          <Link className={`${styles.button} ${styles.primary}`} href="/signup">
            Get started
          </Link>
        </div>
      </nav>
      <section className={styles.hero}>
        <p className="eyebrow">PRIVATE. SIMPLE. SECURE.</p>
        <h1>Your files, ready for the right people.</h1>
        <p className={styles.heroCopy}>
          A focused data room for sharing important documents with confidence. Organise, preview and
          share everything from one calm workspace.
        </p>
        <div className={styles.heroActions}>
          <Link className={`${styles.button} ${styles.primary} ${styles.large}`} href="/signup">
            Create your data room
          </Link>
          <Link className={`${styles.button} ${styles.secondary} ${styles.large}`} href="/signin">
            I already have an account
          </Link>
        </div>
      </section>
      <section className={styles.features}>
        <article>
          <span className={styles.number}>01</span>
          <h2>One clear workspace</h2>
          <p>Keep folders and files easy to find as your room grows.</p>
        </article>
        <article>
          <span className={styles.number}>02</span>
          <h2>Share with purpose</h2>
          <p>Give the right people access without losing control.</p>
        </article>
        <article>
          <span className={styles.number}>03</span>
          <h2>Built for focus</h2>
          <p>A straightforward experience that keeps the work moving.</p>
        </article>
      </section>
    </main>
  );
}
