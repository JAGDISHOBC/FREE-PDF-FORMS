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
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {})
      },
      cache: "no-store"
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
    loginForm.addEventListener("submit", () => {
      if (message) showMessage(message, "Signing in…");
      button.disabled = true;
      button.textContent = "Signing in…";
    });
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "invalid") showMessage(message, "Invalid username or password.");
    return;
  }

  const dashboard = $("adminUsername");
  if (!dashboard) return;

  loadDashboard();

  async function loadDashboard() {
    const message = $("dashboardMessage");
    try {
      const me = await api("/api/admin/me");
      dashboard.textContent = me.data.username;
      const result = await api("/api/admin/dashboard");
      $("departmentCount").textContent = result.data.departments;
      $("formCount").textContent = result.data.forms;
      $("linkCount").textContent = result.data.governmentLinks;
      await loadDepartments();
    } catch (error) {
      if (error.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      showMessage(message, error.message || "Unable to load dashboard.");
    }
  }

  async function loadDepartments() {
    const body = $("departmentsBody");
    try {
      const result = await api("/api/admin/departments");
      renderDepartments(result.data.departments || []);
    } catch (error) {
      if (error.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      body.innerHTML = `<tr><td colspan="6" class="table-empty">${escapeHtml(error.message || "Unable to load departments.")}</td></tr>`;
    }
  }

  function renderDepartments(departments) {
    const body = $("departmentsBody");
    if (!departments.length) {
      body.innerHTML = `<tr><td colspan="6" class="table-empty">No departments found.</td></tr>`;
      return;
    }

    body.innerHTML = departments.map((department) => {
      const status = Number(department.is_active) === 1;
      const formCount = Number(department.form_count || 0);
      return `
        <tr>
          <td><span class="order-badge">${escapeHtml(department.sort_order)}</span></td>
          <td><div class="dept-name"><span class="dept-icon">${escapeHtml(department.icon || "📁")}</span><strong>${escapeHtml(department.name)}</strong></div></td>
          <td><span class="description-cell">${escapeHtml(department.description || "—")}</span></td>
          <td><span class="status-badge ${status ? "active" : "inactive"}">${status ? "Active" : "Inactive"}</span></td>
          <td>${formCount}</td>
          <td><div class="row-actions">
            <button class="small-button" data-action="edit" data-id="${department.id}" type="button">Edit</button>
            <button class="small-button" data-action="toggle" data-id="${department.id}" type="button">${status ? "Disable" : "Enable"}</button>
            <button class="small-button danger" data-action="delete" data-id="${department.id}" type="button">Delete</button>
          </div></td>
        </tr>`;
    }).join("");
  }

  $("departmentsBody")?.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const id = Number(button.dataset.id);
    const action = button.dataset.action;
    if (!id) return;

    try {
      const result = await api("/api/admin/departments");
      const department = (result.data.departments || []).find((item) => Number(item.id) === id);
      if (!department) throw new Error("Department not found.");

      if (action === "edit") openDepartmentModal(department);
      if (action === "toggle") await toggleDepartment(department);
      if (action === "delete") await deleteDepartment(department);
    } catch (error) {
      showMessage($("departmentMessage"), error.message || "Action failed.");
    }
  });

  async function toggleDepartment(department) {
    await api(`/api/admin/departments/${department.id}`, {
      method: "PUT",
      body: JSON.stringify({
        name: department.name,
        description: department.description || "",
        icon: department.icon || "",
        sort_order: department.sort_order,
        is_active: Number(department.is_active) === 1 ? 0 : 1
      })
    });
    showMessage($("departmentMessage"), "Department status updated.", "success");
    await refreshAll();
  }

  async function deleteDepartment(department) {
    const forms = Number(department.form_count || 0);
    const prompt = forms > 0
      ? `This department has ${forms} PDF form${forms === 1 ? "" : "s"} and cannot be deleted yet.`
      : `Delete “${department.name}”? This cannot be undone.`;
    if (forms > 0) {
      showMessage($("departmentMessage"), prompt);
      return;
    }
    if (!window.confirm(prompt)) return;
    await api(`/api/admin/departments/${department.id}`, { method: "DELETE" });
    showMessage($("departmentMessage"), "Department deleted.", "success");
    await refreshAll();
  }

  $("addDepartmentButton")?.addEventListener("click", () => {
    const rows = document.querySelectorAll("#departmentsBody tr");
    openDepartmentModal({
      id: "",
      name: "",
      description: "",
      icon: "📁",
      sort_order: rows.length ? rows.length + 1 : 1,
      is_active: 1
    });
  });

  $("closeDepartmentModal")?.addEventListener("click", closeDepartmentModal);
  $("cancelDepartmentButton")?.addEventListener("click", closeDepartmentModal);
  $("departmentModal")?.addEventListener("click", (event) => {
    if (event.target.dataset.closeModal) closeDepartmentModal();
  });

  function openDepartmentModal(department) {
    $("departmentId").value = department.id || "";
    $("departmentName").value = department.name || "";
    $("departmentDescription").value = department.description || "";
    $("departmentIcon").value = department.icon || "";
    $("departmentSort").value = Number(department.sort_order || 0);
    $("departmentActive").checked = Number(department.is_active) === 1;
    $("departmentModalTitle").textContent = department.id ? "Edit Department" : "Add Department";
    showMessage($("departmentFormMessage"), "");
    $("departmentModal").classList.remove("hidden");
    $("departmentModal").setAttribute("aria-hidden", "false");
    setTimeout(() => $("departmentName").focus(), 0);
  }

  function closeDepartmentModal() {
    $("departmentModal")?.classList.add("hidden");
    $("departmentModal")?.setAttribute("aria-hidden", "true");
  }

  $("departmentForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const save = $("saveDepartmentButton");
    const id = $("departmentId").value.trim();
    const payload = {
      name: $("departmentName").value.trim(),
      description: $("departmentDescription").value.trim(),
      icon: $("departmentIcon").value.trim(),
      sort_order: Number($("departmentSort").value || 0),
      is_active: $("departmentActive").checked ? 1 : 0
    };

    save.disabled = true;
    showMessage($("departmentFormMessage"), "Saving…", "success");
    try {
      if (id) {
        await api(`/api/admin/departments/${id}`, { method: "PUT", body: JSON.stringify(payload) });
      } else {
        await api("/api/admin/departments", { method: "POST", body: JSON.stringify(payload) });
      }
      closeDepartmentModal();
      showMessage($("departmentMessage"), id ? "Department updated successfully." : "Department added successfully.", "success");
      await refreshAll();
    } catch (error) {
      showMessage($("departmentFormMessage"), error.message || "Unable to save department.");
    } finally {
      save.disabled = false;
    }
  });

  async function refreshAll() {
    await Promise.all([refreshDashboardCounts(), loadDepartments()]);
  }

  async function refreshDashboardCounts() {
    const result = await api("/api/admin/dashboard");
    $("departmentCount").textContent = result.data.departments;
    $("formCount").textContent = result.data.forms;
    $("linkCount").textContent = result.data.governmentLinks;
  }

  $("logoutButton")?.addEventListener("click", async () => {
    const button = $("logoutButton");
    button.disabled = true;
    button.textContent = "Logging out…";
    try { await api("/api/admin/logout", { method: "POST" }); }
    finally { window.location.href = "/admin/login"; }
  });

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
})();
