import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const SITE_URL = "https://www.engineeringdrawing.io";
const DEFAULT_IMAGE = `${SITE_URL}/assets/preview.png`;

const PAGE_META = {
  "/": {
    title: "AI Industrial Engineering Design Software | Engineering Drawing",
    description: "Design evaporators, reactors and distillation systems with browser-based industrial engineering tools for sizing, balances and process documentation.",
  },
  "/project-overview": {
    title: "Industry 4.0 Industrial Engineering Solutions | Engineering Drawing",
    description: "Explore Industry 4.0 industrial engineering solutions for refinery, pharmaceutical and environmental projects, designed for efficiency, sustainability and transparent collaboration.",
  },
  "/industrial-design": {
    title: "Industrial Process Design Tools | Engineering Drawing",
    description: "Use industrial process design tools for MVR evaporators, reactors and distillation columns, including sizing, energy balances and P&ID outputs.",
  },
  "/process-design": {
    title: "Process Flow Design Simulator | Engineering Drawing",
    description: "Build and explore industrial process-flow designs with Engineering Drawing's browser-based process engineering simulator.",
  },
  "/evaporators": {
    title: "MVR Evaporator Design Calculator & 3D Plant Simulator",
    description: "Simulate 1-5 TPH industrial wastewater MVR evaporators with live heat and mass balance, compressor energy, equipment sizing, PFD, 3D plant layout and CAPEX estimate.",
    type: "SoftwareApplication",
  },
  "/reactors": {
    title: "Reactor Design Calculator, Live PFD & 3D Plant Simulator",
    description: "Simulate batch, CSTR and PFR reactor systems with live kinetics, vessel sizing, heat duty, agitation, utilities, piping, CAPEX, PFD and interactive 3D plant layout.",
    type: "SoftwareApplication",
  },
  "/distillation": {
    title: "Industrial Distillation Column Design & 3D Plant Simulator",
    description: "Simulate industrial binary distillation with live feed and product balance, Fenske-Underwood-Gilliland stages, tray or packing hydraulics, condenser and reboiler duties, utilities, PFD, 3D plant and downloadable engineering package.",
    type: "SoftwareApplication",
  },
  "/tokenomics": {
    title: "EDG Tokenomics & Token Allocation | Engineering Drawing",
    description: "Explore EDG tokenomics, presale stages and token allocation supporting community development, sustainable industry programs and liquidity management.",
  },
  "/presale": {
    title: "EDG Token Presale on BNB Smart Chain | Engineering Drawing",
    description: "Buy EDG in the public BNB Smart Chain presale. Review live stages, price, wallet limits and official contract links before purchasing.",
  },
  "/contact": {
    title: "Contact Engineering Drawing | Industrial Engineering Platform",
    description: "Contact Engineering Drawing for information about AI-assisted industrial process design, engineering tools and the EDG ecosystem.",
  },
  "/construction-design": {
    title: "Construction Design | Engineering Drawing",
    description: "Construction Design resources from Engineering Drawing.",
    robots: "noindex,follow",
  },
};

const LEGACY_PATHS = {
  "/industrialdesign": "/industrial-design",
  "/constructiondesign": "/construction-design",
  "/processdesign": "/process-design",
};

function setMeta(selector, attribute, value) {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement("meta");
    document.head.appendChild(element);
  }
  Object.entries(attribute).forEach(([name, content]) => element.setAttribute(name, content));
  element.setAttribute("content", value);
}

export default function Seo() {
  const location = useLocation();

  useEffect(() => {
    const rawPath = location.pathname.toLowerCase().replace(/\/$/, "") || "/";
    const path = LEGACY_PATHS[rawPath] || rawPath;
    const page = PAGE_META[path] || PAGE_META["/"];
    const canonicalUrl = `${SITE_URL}${path}`;

    document.title = page.title;
    setMeta('meta[name="description"]', { name: "description" }, page.description);
    setMeta('meta[name="robots"]', { name: "robots" }, page.robots || "index,follow,max-image-preview:large");
    setMeta('meta[property="og:title"]', { property: "og:title" }, page.title);
    setMeta('meta[property="og:description"]', { property: "og:description" }, page.description);
    setMeta('meta[property="og:url"]', { property: "og:url" }, canonicalUrl);
    setMeta('meta[property="og:image"]', { property: "og:image" }, DEFAULT_IMAGE);
    setMeta('meta[name="twitter:title"]', { name: "twitter:title" }, page.title);
    setMeta('meta[name="twitter:description"]', { name: "twitter:description" }, page.description);
    setMeta('meta[name="twitter:image"]', { name: "twitter:image" }, DEFAULT_IMAGE);

    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", canonicalUrl);

    let structuredData = document.head.querySelector("#route-structured-data");
    if (!structuredData) {
      structuredData = document.createElement("script");
      structuredData.id = "route-structured-data";
      structuredData.type = "application/ld+json";
      document.head.appendChild(structuredData);
    }
    structuredData.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": page.type || "WebPage",
      name: page.title,
      description: page.description,
      url: canonicalUrl,
      ...(page.type === "SoftwareApplication" ? {
        applicationCategory: "EngineeringApplication",
        applicationSubCategory: "Process Engineering Software",
        operatingSystem: "Web",
        browserRequirements: "Requires JavaScript and WebGL",
        featureList: [
          "Live evaporator heat and mass balance",
          "MVR compressor power estimation",
          "Process flow diagram",
          "Capacity-dependent 3D plant arrangement",
          "Equipment, pump, line, valve and instrument schedules",
          "Budgetary capital cost estimate",
        ],
        offers: { "@type": "Offer", price: "100", priceCurrency: "USD", availability: "https://schema.org/InStock" },
      } : {}),
      isPartOf: {
        "@type": "WebSite",
        name: "Engineering Drawing",
        url: SITE_URL,
      },
      publisher: {
        "@type": "Organization",
        name: "Engineering Drawing",
        url: SITE_URL,
        logo: { "@type": "ImageObject", url: `${SITE_URL}/assets/logo-512.png` },
      },
    });
  }, [location.pathname]);

  return null;
}
