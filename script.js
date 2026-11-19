/* =========================================================
   EcoStore — Landing Page Interactions
   ---------------------------------------------------------
   1. Icons
   2. Sticky navbar
   3. Mobile menu
   4. Smooth scrolling + active nav link
   5. Cart (add to cart, counter, feedback)
   6. Wishlist toggle
   7. Newsletter validation
   8. Scroll reveal animations
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  /* ---------- 1. Icons ---------- */
  // Lucide replaces every <i data-lucide="..."> with an inline SVG.
  if (window.lucide) {
    lucide.createIcons();
  }

  const navbar = document.getElementById("navbar");
  const navMenu = document.getElementById("nav-menu");
  const menuToggle = document.getElementById("menu-toggle");
  const navLinks = document.querySelectorAll(".nav-link");

  /* ---------- 2. Sticky navbar ---------- */
  const handleNavbarScroll = () => {
    navbar.classList.toggle("scrolled", window.scrollY > 20);
  };
  handleNavbarScroll();
  window.addEventListener("scroll", handleNavbarScroll, { passive: true });

  /* ---------- 3. Mobile menu ---------- */
  const setMenu = (isOpen) => {
    navMenu.classList.toggle("open", isOpen);
    menuToggle.classList.toggle("open", isOpen);
    navbar.classList.toggle("menu-open", isOpen);
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
  };

  menuToggle.addEventListener("click", () => {
    setMenu(!navMenu.classList.contains("open"));
  });

  // Close on Escape or when clicking outside the menu
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && navMenu.classList.contains("open")) {
      setMenu(false);
      menuToggle.focus();
    }
  });
  document.addEventListener("click", (e) => {
    if (navMenu.classList.contains("open") && !navbar.contains(e.target)) {
      setMenu(false);
    }
  });

  // Reset the menu when resizing up to desktop
  window.addEventListener("resize", () => {
    if (window.innerWidth > 860) setMenu(false);
  });

  /* ---------- 4. Smooth scrolling + active nav link ---------- */
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (e) => {
      const id = link.getAttribute("href");
      if (id === "#") {
        e.preventDefault(); // demo social links
        return;
      }
      const target = document.querySelector(id);
      if (!target) return;

      e.preventDefault();
      setMenu(false);
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      history.replaceState(null, "", id);
    });
  });

  // Highlight the nav link of the section currently in view
  const sections = ["home", "shop", "about", "sustainability", "contact"]
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  const setActiveLink = (id) => {
    navLinks.forEach((link) => {
      link.classList.toggle("active", link.getAttribute("href") === `#${id}`);
    });
  };

  const updateActiveOnScroll = () => {
    const offset = window.scrollY + window.innerHeight * 0.35;
    let current = sections[0].id;
    sections.forEach((section) => {
      if (section.offsetTop <= offset) current = section.id;
    });
    // Footer (contact) is short — treat reaching the page bottom as "contact"
    if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 4) {
      current = "contact";
    }
    setActiveLink(current);
  };
  updateActiveOnScroll();
  window.addEventListener("scroll", updateActiveOnScroll, { passive: true });

  /* ---------- 5. Cart ---------- */
  const cartBtn = document.getElementById("cart-btn");
  const cartCount = document.getElementById("cart-count");
  const toast = document.getElementById("toast");
  const toastText = document.getElementById("toast-text");

  // Simple in-memory cart: { productId: { name, price, qty } }
  const cart = {};
  let toastTimer;

  const getCartTotals = () => {
    return Object.values(cart).reduce(
      (totals, item) => {
        totals.qty += item.qty;
        totals.price += item.qty * item.price;
        return totals;
      },
      { qty: 0, price: 0 }
    );
  };

  const showToast = (message) => {
    toastText.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
  };

  const updateCartUI = () => {
    const { qty } = getCartTotals();
    cartCount.textContent = qty;
    cartCount.classList.toggle("visible", qty > 0);
    cartBtn.setAttribute("aria-label", `Shopping cart, ${qty} item${qty === 1 ? "" : "s"}`);

    // Restart the bump animation
    cartBtn.classList.remove("bump");
    void cartBtn.offsetWidth;
    cartBtn.classList.add("bump");
  };

  const addToCart = (card, button) => {
    const { id, name, price } = card.dataset;
    if (!cart[id]) {
      cart[id] = { name, price: parseFloat(price), qty: 0 };
    }
    cart[id].qty += 1;
    updateCartUI();

    // Button feedback
    const label = button.querySelector("span");
    button.classList.add("added");
    label.textContent = "Added!";
    setTimeout(() => {
      button.classList.remove("added");
      label.textContent = "Add to Cart";
    }, 1400);

    showToast(`${name} added to cart (${cart[id].qty} in cart)`);
  };

  document.querySelectorAll(".product-card").forEach((card) => {
    const addBtn = card.querySelector(".btn-add");
    addBtn.addEventListener("click", () => addToCart(card, addBtn));
  });

  // Clicking the cart icon shows a quick summary (no real checkout)
  cartBtn.addEventListener("click", () => {
    const { qty, price } = getCartTotals();
    if (qty === 0) {
      showToast("Your cart is empty — find something you love!");
    } else {
      showToast(`${qty} item${qty === 1 ? "" : "s"} · $${price.toFixed(2)} (demo total)`);
    }
  });

  /* ---------- 6. Wishlist toggle ---------- */
  document.querySelectorAll(".wish-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const isSaved = btn.getAttribute("aria-pressed") === "true";
      btn.setAttribute("aria-pressed", String(!isSaved));
      const name = btn.closest(".product-card").dataset.name;
      showToast(isSaved ? `${name} removed from wishlist` : `${name} saved to wishlist`);
    });
  });

  /* ---------- 7. Newsletter validation ---------- */
  const form = document.getElementById("newsletter-form");
  const emailInput = document.getElementById("email");
  const formMsg = document.getElementById("form-msg");
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  const setFormMessage = (text, type) => {
    formMsg.textContent = text;
    formMsg.className = `form-msg ${type}`;
    emailInput.classList.toggle("invalid", type === "error");
    emailInput.setAttribute("aria-invalid", String(type === "error"));
  };

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();

    if (!email) {
      setFormMessage("Please enter your email address.", "error");
      emailInput.focus();
      return;
    }
    if (!emailPattern.test(email)) {
      setFormMessage("Please enter a valid email, like name@example.com.", "error");
      emailInput.focus();
      return;
    }

    // No real email service — just confirm on the page
    setFormMessage("🌿 Thanks for subscribing! Check your inbox for your welcome gift.", "success");
    form.reset();
  });

  // Clear the error as soon as the user starts fixing it
  emailInput.addEventListener("input", () => {
    if (emailInput.classList.contains("invalid")) setFormMessage("", "");
  });

  /* ---------- 8. Scroll reveal animations ---------- */
  const revealEls = document.querySelectorAll(".reveal");

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach((el) => observer.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("in-view"));
  }

  /* ---------- Footer year ---------- */
  document.getElementById("year").textContent = new Date().getFullYear();
});

/* =========================================================
   9. EcoStore AI Chatbot
   ---------------------------------------------------------
   Talks to the Express backend (backend/server.js).
   The Gemini API key lives only on the server.
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  const CHAT_API_URL = "http://localhost:3001/chat";
  const MAX_LENGTH = 1000;

  const fab = document.getElementById("chat-fab");
  const chatWindow = document.getElementById("chat-window");
  const closeBtn = document.getElementById("chat-close");
  const messagesEl = document.getElementById("chat-messages");
  const form = document.getElementById("chat-form");
  const input = document.getElementById("chat-input");
  const sendBtn = document.getElementById("chat-send");

  // Conversation history sent to the backend for context
  const history = [];
  let isWaiting = false;

  /* ---------- Open / close ---------- */
  const setChatOpen = (isOpen) => {
    chatWindow.classList.toggle("open", isOpen);
    fab.classList.toggle("open", isOpen);
    chatWindow.setAttribute("aria-hidden", String(!isOpen));
    fab.setAttribute("aria-expanded", String(isOpen));
    fab.setAttribute("aria-label", isOpen ? "Close EcoStore assistant" : "Open EcoStore assistant");
    if (isOpen) setTimeout(() => input.focus(), 250);
  };

  fab.addEventListener("click", () => setChatOpen(!chatWindow.classList.contains("open")));
  closeBtn.addEventListener("click", () => {
    setChatOpen(false);
    fab.focus();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && chatWindow.classList.contains("open")) {
      setChatOpen(false);
      fab.focus();
    }
  });

  /* ---------- Rendering helpers ---------- */
  const isArabic = (text) => /[\u0600-\u06FF]/.test(text);

  const scrollToBottom = () => {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  };

  // type: "user" | "bot" | "error"
  const addMessage = (text, type) => {
    const bubble = document.createElement("div");
    bubble.className = `msg msg--${type} msg--text`;
    bubble.textContent = text; // textContent = safe, no HTML injection
    bubble.dir = isArabic(text) ? "rtl" : "ltr";
    messagesEl.appendChild(bubble);
    scrollToBottom();
    return bubble;
  };

  const showTyping = () => {
    const bubble = document.createElement("div");
    bubble.className = "msg msg--bot typing";
    bubble.setAttribute("aria-label", "Assistant is typing");
    bubble.innerHTML = "<span></span><span></span><span></span>";
    messagesEl.appendChild(bubble);
    scrollToBottom();
    return bubble;
  };

  const setWaiting = (waiting) => {
    isWaiting = waiting;
    sendBtn.disabled = waiting;
    input.setAttribute("aria-busy", String(waiting));
  };

  /* ---------- Sending ---------- */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (isWaiting) return;

    const message = input.value.trim();

    // Validate empty messages
    if (!message) {
      input.classList.remove("invalid");
      void input.offsetWidth; // restart shake animation
      input.classList.add("invalid");
      input.focus();
      return;
    }
    if (message.length > MAX_LENGTH) {
      addMessage(`Please keep your message under ${MAX_LENGTH} characters.`, "error");
      return;
    }

    input.classList.remove("invalid");
    input.value = "";
    addMessage(message, "user");
    setWaiting(true);
    const typing = showTyping();

    try {
      const res = await fetch(CHAT_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.reply) {
        throw new Error(data.error || "Something went wrong. Please try again.");
      }

      typing.remove();
      addMessage(data.reply, "bot");
      history.push({ role: "user", text: message }, { role: "model", text: data.reply });
    } catch (err) {
      typing.remove();
      // fetch() throws TypeError when the server can't be reached
      const text =
        err instanceof TypeError
          ? "Can't reach the assistant. Make sure the backend is running on port 3001."
          : err.message;
      addMessage(isArabic(message) ? `عذراً، حدث خطأ. ${text}` : text, "error");
    } finally {
      setWaiting(false);
      input.focus();
    }
  });

  input.addEventListener("input", () => input.classList.remove("invalid"));
});
