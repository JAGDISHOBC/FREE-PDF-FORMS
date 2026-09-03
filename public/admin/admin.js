(() => {
  const $ = (id) => document.getElementById(id);

  const showMessage = (element, text, type = "") => {
    if (!element) return;
    element.textContent = text || "";
    element.className = type ? `message ${type}` : "message";
  };

  async function api(url, options = {}) {
    const response = await fetch(url, {
      credentials: "same-origin",
      ...options,
      headers: {
        ...(options.body ? {"Content-Type": "application/json"} : {}),
        ...(options.headers || {})
      }
    });

    let data = null;
    try { data = await response.json(); } catch {}

    if (!response.ok) {
      const error = new Error(data?.error || "Request failed.");
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  const loginForm = $("loginForm");
  if (loginForm) {
    const button = $("loginButton");
    const message = $("loginMessage");

    // Let the browser perform the POST. The Worker sets the HttpOnly
    // session cookie and returns a 303 redirect to /admin in one response.
    loginForm.addEventListener("submit", () => {
      if (message) showMessage(message, "Signing in…");
      button.disabled = true;
      button.textContent = "Signing in…";
    });

    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "invalid") {
      showMessage(message, "Invalid username or password.");
    }
  }

  const dashboard = $("adminUsername");
  if (dashboard) {
    loadDashboard();
  }

  async function loadDashboard() {
    const message = $("dashboardMessage");

    try {
      const me = await api("/api/admin/me");
      $("adminUsername").textContent = me.data.username;

      const result = await api("/api/admin/dashboard");
      $("departmentCount").textContent = result.data.departments;
      $("formCount").textContent = result.data.forms;
      $("linkCount").textContent = result.data.governmentLinks;
    } catch (error) {
      if (error.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      showMessage(message, error.message || "Unable to load dashboard.");
    }
  }

  $("logoutButton")?.addEventListener("click", async () => {
    const button = $("logoutButton");
    button.disabled = true;
    button.textContent = "Logging out…";

    try {
      await api("/api/admin/logout", { method: "POST" });
    } finally {
      window.location.href = "/admin/login";
    }
  });
})();
