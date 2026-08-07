import React, { useState } from "react";

const faqData = [
  {
    question: "What is EngineeringDrawing.io?",
    answer:
      "EngineeringDrawing.io is an AI-powered industrial engineering platform designed to help engineers, manufacturers, equipment suppliers, and engineering teams perform engineering calculations, generate technical documentation, and improve industrial design workflows.",
  },
  {
    question: "Who can use EngineeringDrawing.io?",
    answer:
      "The platform is designed for process engineers, chemical engineers, manufacturers, EPC companies, industrial equipment suppliers, engineering consultants, and technical teams.",
  },
  {
    question: "What can EngineeringDrawing AI do?",
    answer:
      "EngineeringDrawing AI can assist with engineering calculations, equipment sizing, technical documentation, Bills of Materials (BOM), process design workflows, industrial design tools, and other engineering activities supported by the platform.",
  },
  {
    question: "Does EngineeringDrawing.io replace a professional engineer?",
    answer:
      "No. EngineeringDrawing.io is an engineering assistance platform. Results should be reviewed and validated by qualified engineers before being used for fabrication, construction, procurement, operation, safety decisions, or regulatory submissions.",
  },
  {
    question: "What is the SHOPLINE integration?",
    answer:
      "EngineeringDrawing AI can integrate with SHOPLINE to provide engineering and technical capabilities for merchants, manufacturers, and industrial businesses using the SHOPLINE ecosystem.",
  },
  {
    question: "What information does the SHOPLINE app access?",
    answer:
      "The app only requests information and permissions required to provide its enabled features. The exact permissions are shown to merchants during the SHOPLINE authorization and installation process.",
  },
  {
    question: "Do you sell customer information?",
    answer:
      "No. EngineeringDrawing.io does not sell personal customer information.",
  },
  {
    question: "Can I request deletion of my data?",
    answer:
      "Yes. Eligible users or merchants can request data deletion by contacting admin@engineeringdrawing.io. Requests will be handled according to applicable legal and platform requirements.",
  },
  {
    question: "Is EngineeringDrawing.io free?",
    answer:
      "Some tools or features may be available free of charge while advanced features, integrations, or future services may require a paid plan. Pricing and availability may change as the platform develops.",
  },
  {
    question: "How do I report a technical problem?",
    answer:
      "Please email admin@engineeringdrawing.io with a description of the issue, relevant screenshots, and the steps that caused the problem.",
  },
  {
    question: "How can I contact EngineeringDrawing.io?",
    answer:
      "You can contact us at admin@engineeringdrawing.io or visit https://engineeringdrawing.io.",
  },
];

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState(null);

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <main style={styles.page}>
      <section style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>Frequently Asked Questions</h1>

          <p style={styles.subtitle}>
            Learn more about EngineeringDrawing.io and EngineeringDrawing AI.
          </p>
        </div>

        <div>
          {faqData.map((faq, index) => (
            <div key={index} style={styles.item}>
              <button
                onClick={() => toggleFAQ(index)}
                style={styles.questionButton}
              >
                <span>{faq.question}</span>

                <span style={styles.icon}>
                  {openIndex === index ? "−" : "+"}
                </span>
              </button>

              {openIndex === index && (
                <div style={styles.answer}>
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={styles.support}>
          <h2>Still need help?</h2>

          <p>
            Contact our support team at{" "}
            <a href="mailto:admin@engineeringdrawing.io">
              admin@engineeringdrawing.io
            </a>
          </p>
        </div>
      </section>
    </main>
  );
};

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f8fafc",
    padding: "60px 20px",
    fontFamily: "Arial, Helvetica, sans-serif",
    color: "#172033",
  },

  container: {
    maxWidth: "900px",
    margin: "0 auto",
  },

  header: {
    textAlign: "center",
    marginBottom: "45px",
  },

  title: {
    fontSize: "42px",
    marginBottom: "12px",
  },

  subtitle: {
    fontSize: "18px",
    color: "#64748b",
  },

  item: {
    background: "#ffffff",
    marginBottom: "12px",
    borderRadius: "12px",
    overflow: "hidden",
    boxShadow: "0 4px 14px rgba(0,0,0,0.05)",
  },

  questionButton: {
    width: "100%",
    padding: "22px",
    border: "none",
    background: "#ffffff",
    textAlign: "left",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    fontSize: "17px",
    fontWeight: "600",
    color: "#172033",
  },

  icon: {
    fontSize: "26px",
    marginLeft: "20px",
  },

  answer: {
    padding: "0 22px 22px",
    lineHeight: "1.7",
    color: "#475569",
  },

  support: {
    marginTop: "40px",
    textAlign: "center",
    padding: "30px",
    borderRadius: "14px",
    background: "#ffffff",
  },
};

export default FAQ;