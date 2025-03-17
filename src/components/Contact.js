import React, { useState } from 'react';
import './Contact.css';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    alert(`Thank you for contacting us, ${formData.name}! We'll get back to you soon.`);
    setFormData({ name: '', email: '', message: '' }); // Clear form
  };

  return (
    <div className="contact-container">
      <h2 className="contact-header">Contact Us</h2>
      <div className="contact-details">
        <div className="contact-info">
          <h3>Get in Touch</h3>
          <p>We're here to help and answer any questions you might have. We look forward to hearing from you.</p>
          <ul>
            <li>Email: <a href="mailto:info@engineeringdrawing.com">engineeringdrawing.tech@gmail.com</a></li>
            <li>Phone: +91 73470 27851</li>
            <li>LinkedIn: <a href="https://www.linkedin.com/company/engineeringdrawing" target="_blank" rel="noopener noreferrer">Follow us on LinkedIn</a></li>
          </ul>
        </div>
        <div className="contact-form">
          <h3>Send Us a Message</h3>
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              name="name"
              placeholder="Your Name"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
            <input
              type="email"
              name="email"
              placeholder="Your Email"
              value={formData.email}
              onChange={handleInputChange}
              required
            />
            <textarea
              name="message"
              placeholder="Your Message"
              value={formData.message}
              onChange={handleInputChange}
              required
            />
            <button type="submit" className="send-button">Send Message</button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Contact;
