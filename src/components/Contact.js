import React, { useState, useRef } from "react";
import "./Contact.css";

const topics = [
  "Presale / Tokenomics",
  "Partnership & Collaboration",
  "Industrial Design (Evaporator/Process)",
  "Support / Bug Report",
  "General Inquiry",
];

const Contact = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    topic: topics[0],
    message: "",
    consent: true,
  });
  const [sent, setSent] = useState(false);
  const toastRef = useRef(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const showToast = (msg) => {
    if (!toastRef.current) return;
    toastRef.current.textContent = msg;
    toastRef.current.classList.add("show");
    setTimeout(() => toastRef.current?.classList.remove("show"), 1800);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      showToast("Please complete required fields.");
      return;
    }
    if (!form.consent) {
      showToast("Please accept the privacy note.");
      return;
    }
    setSent(true);
    showToast("Message sent. We’ll reply shortly.");
    setTimeout(() => {
      setForm({
        name: "",
        email: "",
        phone: "",
        topic: topics[0],
        message: "",
        consent: true,
      });
      setSent(false);
    }, 1000);
  };

  const mailTo = `mailto:engineeringdrawing.tech@gmail.com?subject=${encodeURIComponent(
    `[EDG] ${form.topic}`
  )}&body=${encodeURIComponent(
    `Name: ${form.name}\nEmail: ${form.email}\nPhone: ${form.phone}\n\n${form.message}`
  )}`;

  const whatsappLink = `https://wa.me/917347027851?text=${encodeURIComponent(
    `Hello Engineering Drawing team,\n\nTopic: ${form.topic}\n\n${form.message || ""}`
  )}`;

  const linkedinUrl = "https://www.linkedin.com/company/engineeringdrawing";

  return (
    <div className="contact-page contact-onecol">
      {/* Toast */}
      <div ref={toastRef} className="contact-toast" role="status" aria-live="polite" />

      {/* HERO — keep this exactly as-is */}
      <section className="contact-hero">
        <div className="hero-copy tok-card">
          <h1>Let’s build something meaningful</h1>
          <p>
            Questions about EDG, partnerships, or industrial design? Drop a line—our team reads every message.
          </p>
          <div className="hero-quick">
            <a className="btn-primary" href={mailTo}>Email Us</a>
            <a className="btn-ghost" href={whatsappLink} target="_blank" rel="noreferrer">WhatsApp</a>
            <a className="btn-linkedin" href={linkedinUrl} target="_blank" rel="noreferrer">LinkedIn</a>
          </div>
        </div>

        <div className="hero-aside tok-card">
          <ul className="quick-stats">
            <li><span>India (Nalanda, BR)</span></li>
            <li><span>BNB Chain • Web3 • Industry 4.0</span></li>
            <li><span>Typically replies within a day</span></li>
          </ul>
        </div>
      </section>

      {/* MAIN — single, centered form (info container removed) */}
      <section className="contact-main tok-card">
        <h2>Send a message</h2>
        <form onSubmit={handleSubmit} noValidate className="contact-form">
          <div className="row">
            <label>
              <span>Name*</span>
              <input
                name="name"
                type="text"
                autoComplete="name"
                value={form.name}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              <span>Email*</span>
              <input
                name="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={handleChange}
                required
              />
            </label>
          </div>

          <div className="row">
            <label>
              <span>Phone</span>
              <input
                name="phone"
                type="tel"
                autoComplete="tel"
                value={form.phone}
                onChange={handleChange}
                placeholder="+91 ..."
              />
            </label>

            <label>
              <span>Topic</span>
              <select name="topic" value={form.topic} onChange={handleChange}>
                {topics.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span>Message*</span>
            <textarea
              name="message"
              rows={4}
              value={form.message}
              onChange={handleChange}
              required
              maxLength={1200}
            />
            <small>{form.message.length}/1200</small>
          </label>

          <label className="consent">
            <input
              type="checkbox"
              name="consent"
              checked={form.consent}
              onChange={handleChange}
            />
            <span>I agree to be contacted about my inquiry.</span>
          </label>

          <div className="actions">
            <button type="submit" className="btn-primary" disabled={sent}>
              {sent ? "Sending..." : "Send message"}
            </button>
            <a className="btn-ghost" href={mailTo}>Use Email Client</a>
          </div>
        </form>
      </section>
    </div>
  );
};

export default Contact;

