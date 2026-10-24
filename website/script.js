(() => {
  const journey = document.querySelector(".journey");
  const line = document.querySelector("#journey-line");
  const stops = [...document.querySelectorAll(".journey-stop")];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (journey && line) {
    const length = line.getTotalLength();
    line.style.setProperty("--line-length", String(length));
    line.style.strokeDasharray = String(length);
    stops.forEach((stop) => stop.style.setProperty("--stop-delay", stop.dataset.delay || "0"));
    if (reduceMotion) {
      line.style.strokeDashoffset = "0";
      stops.forEach((stop) => { stop.style.opacity = "1"; stop.style.transform = "none"; });
    } else {
      journey.classList.add("is-animated");
    }
  }

  const form = document.querySelector("[data-signup]");
  const email = document.querySelector("#email");
  const status = document.querySelector("#form-status");
  if (!form || !email || !status) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const value = email.value.trim();
    status.className = "form-status";

    if (!value || !email.validity.valid) {
      status.textContent = "Enter a valid email address.";
      status.classList.add("error");
      email.focus();
      return;
    }

    const button = form.querySelector("button");
    email.disabled = true;
    button.disabled = true;
    button.textContent = "SENDING…";
    status.textContent = "Saving your spot…";

    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: value })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "We could not save your email. Please try again.");
      form.remove();
      status.className = "form-status success";
      status.textContent = "You’re on the list. See you in December.";
    } catch (error) {
      email.disabled = false;
      button.disabled = false;
      button.textContent = "JOIN THE LIST";
      status.textContent = error instanceof Error ? error.message : "We could not save your email. Please try again.";
      status.classList.add("error");
    }
  });
})();
