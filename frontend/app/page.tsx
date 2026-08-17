import Link from 'next/link';

export default function Home() {
  return (
    <main className="landing-page">
      <nav className="site-nav">
        <Link className="brand" href="/">
          Acme<span>Data Room</span>
        </Link>
        <div className="nav-actions">
          <Link className="text-link" href="/signin">
            Sign in
          </Link>
          <Link className="button primary" href="/signup">
            Get started
          </Link>
        </div>
      </nav>
      <section className="hero">
        <p className="eyebrow">PRIVATE. SIMPLE. SECURE.</p>
        <h1>Your files, ready for the right people.</h1>
        <p className="hero-copy">
          A focused data room for sharing important documents with confidence. Organise, preview and
          share everything from one calm workspace.
        </p>
        <div className="hero-actions">
          <Link className="button primary large" href="/signup">
            Create your data room
          </Link>
          <Link className="button secondary large" href="/signin">
            I already have an account
          </Link>
        </div>
      </section>
      <section className="feature-grid">
        <article>
          <span className="feature-number">01</span>
          <h2>One clear workspace</h2>
          <p>Keep folders and files easy to find as your room grows.</p>
        </article>
        <article>
          <span className="feature-number">02</span>
          <h2>Share with purpose</h2>
          <p>Give the right people access without losing control.</p>
        </article>
        <article>
          <span className="feature-number">03</span>
          <h2>Built for focus</h2>
          <p>A straightforward experience that keeps the work moving.</p>
        </article>
      </section>
    </main>
  );
}
