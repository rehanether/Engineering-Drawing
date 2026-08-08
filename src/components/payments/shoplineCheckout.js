const CHECKOUT_URLS = {
  reactor: process.env.REACT_APP_SHOPLINE_REACTOR_CHECKOUT_URL || "",
  distillation: process.env.REACT_APP_SHOPLINE_DISTILLATION_CHECKOUT_URL || "",
};

function safeHostedCheckoutUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

export function getShoplineCheckoutUrl(product) {
  return safeHostedCheckoutUrl(CHECKOUT_URLS[product] || "");
}

export function shoplineCheckoutEnabled(product) {
  return Boolean(getShoplineCheckoutUrl(product));
}

export function openShoplineCheckout(product) {
  const checkoutUrl = getShoplineCheckoutUrl(product);
  if (!checkoutUrl) {
    throw new Error("SHOPLINE hosted checkout is awaiting the product Buy Button URL.");
  }
  window.location.assign(checkoutUrl);
}
