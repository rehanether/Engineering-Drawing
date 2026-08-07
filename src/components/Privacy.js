import React from "react";

const Privacy = () => {
  return (
    <main style={styles.page}>
      <section style={styles.container}>
        <h1 style={styles.title}>Privacy Policy</h1>

        <p style={styles.updated}>Last updated: August 7, 2026</p>

        <p style={styles.text}>
          EngineeringDrawing.io ("Engineering Drawing", "we", "our", or "us")
          respects your privacy and is committed to protecting your personal
          information. This Privacy Policy explains how we collect, use, store,
          and protect information when you use our website, applications,
          engineering tools, integrations, and related services.
        </p>

        <h2 style={styles.heading}>1. Information We Collect</h2>

        <p style={styles.text}>
          We may collect information that you voluntarily provide when you
          create an account, contact us, use our engineering tools, submit a
          form, request support, or connect a third-party service.
        </p>

        <ul style={styles.list}>
          <li>Name and contact information</li>
          <li>Email address</li>
          <li>Company or organization information</li>
          <li>Account and authentication information</li>
          <li>Engineering inputs and project information submitted by users</li>
          <li>Technical information such as browser, device, and IP address</li>
          <li>Usage and diagnostic information</li>
        </ul>

        <h2 style={styles.heading}>2. How We Use Information</h2>

        <p style={styles.text}>
          We use information to operate, maintain, secure, and improve
          EngineeringDrawing.io and its services.
        </p>

        <ul style={styles.list}>
          <li>Provide engineering tools and application features</li>
          <li>Process calculations and user-submitted engineering data</li>
          <li>Provide technical support</li>
          <li>Improve platform performance and user experience</li>
          <li>Detect security threats, abuse, and unauthorized activity</li>
          <li>Communicate important service and account information</li>
          <li>Comply with applicable legal obligations</li>
        </ul>

        <h2 style={styles.heading}>3. SHOPLINE Integration</h2>

        <p style={styles.text}>
          EngineeringDrawing.io may integrate with SHOPLINE. When a merchant
          installs or connects our application, we may receive information
          authorized by that merchant through SHOPLINE APIs.
        </p>

        <p style={styles.text}>
          We only access information required to provide the features requested
          by the merchant and according to the permissions granted during app
          authorization.
        </p>

        <h2 style={styles.heading}>4. Third-Party Services</h2>

        <p style={styles.text}>
          We may use trusted third-party technology providers for hosting,
          analytics, authentication, artificial intelligence, communications,
          security, and infrastructure. These providers may process information
          only as necessary to provide their services.
        </p>

        <h2 style={styles.heading}>5. Data Security</h2>

        <p style={styles.text}>
          We use reasonable technical and organizational safeguards designed
          to protect information against unauthorized access, disclosure,
          alteration, misuse, or destruction.
        </p>

        <p style={styles.text}>
          However, no internet-based service can guarantee absolute security.
          Users are responsible for keeping their account credentials secure.
        </p>

        <h2 style={styles.heading}>6. Data Retention</h2>

        <p style={styles.text}>
          We retain information only for as long as reasonably necessary to
          provide our services, meet operational requirements, resolve disputes,
          maintain security, and comply with applicable law.
        </p>

        <h2 style={styles.heading}>7. Data Deletion</h2>

        <p style={styles.text}>
          Users and merchants may request deletion of eligible personal
          information by contacting us. Where required by a connected platform,
          including SHOPLINE, we will process valid customer or store data
          deletion requests according to applicable requirements.
        </p>

        <h2 style={styles.heading}>8. Cookies and Similar Technologies</h2>

        <p style={styles.text}>
          EngineeringDrawing.io may use cookies and similar technologies for
          authentication, security, performance, analytics, and improving the
          functionality of the website.
        </p>

        <h2 style={styles.heading}>9. Children's Privacy</h2>

        <p style={styles.text}>
          Our services are intended for professional, commercial, and
          engineering use and are not directed toward children.
        </p>

        <h2 style={styles.heading}>10. Changes to This Policy</h2>

        <p style={styles.text}>
          We may update this Privacy Policy from time to time. Changes will be
          published on this page with an updated revision date.
        </p>

        <h2 style={styles.heading}>11. Contact Us</h2>

        <p style={styles.text}>
          If you have questions, privacy requests, or data deletion requests,
          contact:
        </p>

        <div style={styles.contact}>
          <strong>EngineeringDrawing.io</strong>
          <br />
          Email:{" "}
          <a href="mailto:admin@engineeringdrawing.io">
            admin@engineeringdrawing.io
          </a>
          <br />
          Website:{" "}
          <a
            href="https://engineeringdrawing.io"
            target="_blank"
            rel="noopener noreferrer"
          >
            https://engineeringdrawing.io
          </a>
        </div>
      </section>
    </main>
  );
};

const styles = {
  page: {
    background: "#f8fafc",
    minHeight: "100vh",
    padding: "60px 20px",
    fontFamily: "Arial, Helvetica, sans-serif",
    color: "#172033",
  },

  container: {
    maxWidth: "900px",
    margin: "0 auto",
    background: "#ffffff",
    padding: "50px",
    borderRadius: "16px",
    boxShadow: "0 8px 30px rgba(0,0,0,0.06)",
  },

  title: {
    fontSize: "42px",
    marginBottom: "8px",
  },

  updated: {
    color: "#64748b",
    marginBottom: "35px",
  },

  heading: {
    fontSize: "24px",
    marginTop: "35px",
    marginBottom: "12px",
  },

  text: {
    lineHeight: "1.8",
    fontSize: "16px",
  },

  list: {
    lineHeight: "1.9",
    paddingLeft: "25px",
  },

  contact: {
    background: "#f1f5f9",
    padding: "20px",
    borderRadius: "10px",
    lineHeight: "1.8",
    marginTop: "15px",
  },
};

export default Privacy;