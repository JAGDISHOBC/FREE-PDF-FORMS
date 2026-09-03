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
      await loadForms();
      await loadDepartmentOptions();
      await loadLinks();
      await loadSettings();
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
    await Promise.all([refreshDashboardCounts(), loadDepartments(), loadForms($("formSearch")?.value.trim() || ""), loadLinks()]);
  }

  async function refreshDashboardCounts() {
    const result = await api("/api/admin/dashboard");
    $("departmentCount").textContent = result.data.departments;
    $("formCount").textContent = result.data.forms;
    $("linkCount").textContent = result.data.governmentLinks;
  }


  async function loadForms(search = "") {
    const body = $("formsBody");
    if (!body) return;
    try {
      const query = search ? `?search=${encodeURIComponent(search)}` : "";
      const result = await api(`/api/admin/forms${query}`);
      renderForms(result.data.forms || []);
    } catch (error) {
      if (error.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      body.innerHTML = `<tr><td colspan="6" class="table-empty">${escapeHtml(error.message || "Unable to load PDF forms.")}</td></tr>`;
    }
  }

  function formatBytes(bytes) {
    const value = Number(bytes || 0);
    if (!value) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    let size = value;
    let index = 0;
    while (size >= 1024 && index < units.length - 1) {
      size /= 1024;
      index++;
    }
    return `${size.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
  }

  function renderForms(forms) {
    const body = $("formsBody");
    if (!forms.length) {
      body.innerHTML = `<tr><td colspan="6" class="table-empty">No PDF forms found.</td></tr>`;
      return;
    }

    body.innerHTML = forms.map((form) => {
      const active = Number(form.is_active) === 1;
      const safeId = Number(form.id);
      return `<tr>
        <td>${escapeHtml(form.sort_order)}</td>
        <td><strong>${escapeHtml(form.name)}</strong><div class="muted table-subtext">${escapeHtml(form.description || "")}</div></td>
        <td>${escapeHtml(form.department_name || "")}</td>
        <td><div>${escapeHtml(form.original_filename || "PDF")}</div><div class="muted table-subtext">${formatBytes(form.file_size)}</div></td>
        <td><span class="status-badge ${active ? "active" : "inactive"}">${active ? "Active" : "Inactive"}</span></td>
        <td class="action-group">
          <a class="secondary-button mini" href="/pdf/${safeId}" target="_blank" rel="noopener">Preview</a>
          <a class="secondary-button mini" href="/download/${safeId}">Download</a>
          <button class="secondary-button mini" data-form-action="edit" data-id="${safeId}" type="button">Edit</button>
          <button class="secondary-button mini" data-form-action="toggle" data-id="${safeId}" type="button">${active ? "Disable" : "Enable"}</button>
          <button class="danger-button mini" data-form-action="delete" data-id="${safeId}" type="button">Delete</button>
        </td>
      </tr>`;
    }).join("");
  }

  async function loadDepartmentOptions(selectedId = "") {
    const select = $("formDepartment");
    if (!select) return;
    try {
      const result = await api("/api/admin/departments");
      const departments = result.data.departments || [];
      select.innerHTML = departments.map((d) => `<option value="${escapeHtml(d.id)}">${escapeHtml(d.icon || "📁")} ${escapeHtml(d.name)}${Number(d.is_active) === 1 ? "" : " (Inactive)"}</option>`).join("");
      if (selectedId) select.value = String(selectedId);
    } catch (error) {
      select.innerHTML = "<option value=\"\">Unable to load departments</option>";
    }
  }

  async function getAdminForm(id) {
    const result = await api(`/api/admin/forms/${id}`);
    return result.data.form;
  }

  function openFormModal(form = null) {
    $("formId").value = form?.id || "";
    $("formName").value = form?.name || "";
    $("formDescription").value = form?.description || "";
    $("formSort").value = Number(form?.sort_order || 1);
    $("formActive").checked = form ? Number(form.is_active) === 1 : true;
    $("formPdfFile").value = "";
    $("formModalTitle").textContent = form ? "Edit PDF Form" : "Add PDF Form";
    $("formFileHint").textContent = form ? "(leave empty to keep current PDF)" : "(required for new forms)";
    $("currentFormFile").textContent = form?.original_filename ? `Current PDF: ${form.original_filename}` : "";
    showMessage($("formFormMessage"), "");
    loadDepartmentOptions(form?.department_id || "");
    $("formModal").classList.remove("hidden");
    $("formModal").setAttribute("aria-hidden", "false");
    setTimeout(() => $("formName").focus(), 0);
  }

  function closeFormModal() {
    $("formModal")?.classList.add("hidden");
    $("formModal")?.setAttribute("aria-hidden", "true");
  }

  $("addFormButton")?.addEventListener("click", () => openFormModal());
  $("closeFormModal")?.addEventListener("click", closeFormModal);
  $("cancelFormButton")?.addEventListener("click", closeFormModal);
  $("formModal")?.addEventListener("click", (event) => {
    if (event.target.dataset.closeFormModal) closeFormModal();
  });

  let formSearchTimer;
  $("formSearch")?.addEventListener("input", (event) => {
    clearTimeout(formSearchTimer);
    formSearchTimer = setTimeout(() => loadForms(event.target.value.trim()), 250);
  });

  $("formsBody")?.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-form-action]");
    if (!button) return;
    const id = Number(button.dataset.id);
    const action = button.dataset.formAction;
    if (!id) return;

    try {
      const form = await getAdminForm(id);
      if (action === "edit") openFormModal(form);
      if (action === "toggle") {
        const data = new FormData();
        data.append("department_id", String(form.department_id));
        data.append("name", form.name);
        data.append("description", form.description || "");
        data.append("sort_order", String(form.sort_order || 0));
        data.append("is_active", Number(form.is_active) === 1 ? "0" : "1");
        await submitFormData(`/api/admin/forms/${id}`, "PUT", data);
        showMessage($("formMessage"), "PDF form status updated.", "success");
        await refreshAll();
      }
      if (action === "delete") {
        if (!window.confirm(`Delete “${form.name}”? This removes the database record and the stored PDF.`)) return;
        await api(`/api/admin/forms/${id}`, { method: "DELETE" });
        showMessage($("formMessage"), "PDF form deleted.", "success");
        await refreshAll();
      }
    } catch (error) {
      showMessage($("formMessage"), error.message || "Action failed.");
    }
  });

  async function submitFormData(url, method, formData) {
    const response = await fetch(url, {
      method,
      body: formData,
      credentials: "same-origin",
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

  $("formForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const save = $("saveFormButton");
    const id = $("formId").value.trim();
    const data = new FormData();
    data.append("department_id", $("formDepartment").value);
    data.append("name", $("formName").value.trim());
    data.append("description", $("formDescription").value.trim());
    data.append("sort_order", String(Number($("formSort").value || 0)));
    data.append("is_active", $("formActive").checked ? "1" : "0");
    const file = $("formPdfFile").files[0];
    if (file) data.append("pdf_file", file, file.name);

    save.disabled = true;
    showMessage($("formFormMessage"), "Saving…", "success");
    try {
      await submitFormData(id ? `/api/admin/forms/${id}` : "/api/admin/forms", id ? "PUT" : "POST", data);
      closeFormModal();
      showMessage($("formMessage"), id ? "PDF form updated successfully." : "PDF form uploaded successfully.", "success");
      await refreshAll();
    } catch (error) {
      showMessage($("formFormMessage"), error.message || "Unable to save PDF form.");
    } finally {
      save.disabled = false;
    }
  });



  async function loadLinks() {
    const body = $("linksBody");
    if (!body) return;
    try {
      const result = await api("/api/admin/links");
      renderLinks(result.data.links || []);
    } catch (error) {
      if (error.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      body.innerHTML = `<tr><td colspan="5" class="table-empty">${escapeHtml(error.message || "Unable to load government links.")}</td></tr>`;
    }
  }

  function renderLinks(links) {
    const body = $("linksBody");
    if (!body) return;
    if (!links.length) {
      body.innerHTML = `<tr><td colspan="5" class="table-empty">No government links found.</td></tr>`;
      return;
    }

    body.innerHTML = links.map((link) => {
      const active = Number(link.is_active) === 1;
      const safeId = Number(link.id);
      const href = String(link.url || "#");
      return `<tr>
        <td><span class="order-badge">${escapeHtml(link.sort_order)}</span></td>
        <td><div class="dept-name"><span class="dept-icon">${escapeHtml(link.icon || "🔗")}</span><div><strong>${escapeHtml(link.name)}</strong><div class="muted table-subtext link-url-cell">${escapeHtml(href)}</div></div></div></td>
        <td><span class="description-cell">${escapeHtml(link.description || "—")}</span></td>
        <td><span class="status-badge ${active ? "active" : "inactive"}">${active ? "Active" : "Inactive"}</span></td>
        <td class="action-group">
          <a class="secondary-button mini" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">Open</a>
          <button class="secondary-button mini" data-link-action="edit" data-id="${safeId}" type="button">Edit</button>
          <button class="secondary-button mini" data-link-action="toggle" data-id="${safeId}" type="button">${active ? "Disable" : "Enable"}</button>
          <button class="danger-button mini" data-link-action="delete" data-id="${safeId}" type="button">Delete</button>
        </td>
      </tr>`;
    }).join("");
  }

  async function getAdminLink(id) {
    const result = await api(`/api/admin/links/${id}`);
    return result.data.link;
  }

  function openLinkModal(link = null) {
    $("linkId").value = link?.id || "";
    $("linkName").value = link?.name || "";
    $("linkUrl").value = link?.url || "";
    $("linkDescription").value = link?.description || "";
    $("linkIcon").value = link?.icon || "";
    $("linkSort").value = Number(link?.sort_order || 1);
    $("linkActive").checked = link ? Number(link.is_active) === 1 : true;
    $("linkModalTitle").textContent = link ? "Edit Government Link" : "Add Government Link";
    showMessage($("linkFormMessage"), "");
    $("linkModal").classList.remove("hidden");
    $("linkModal").setAttribute("aria-hidden", "false");
    setTimeout(() => $("linkName").focus(), 0);
  }

  function closeLinkModal() {
    $("linkModal")?.classList.add("hidden");
    $("linkModal")?.setAttribute("aria-hidden", "true");
  }

  $("addLinkButton")?.addEventListener("click", () => openLinkModal());
  $("closeLinkModal")?.addEventListener("click", closeLinkModal);
  $("cancelLinkButton")?.addEventListener("click", closeLinkModal);
  $("linkModal")?.addEventListener("click", (event) => {
    if (event.target.dataset.closeLinkModal) closeLinkModal();
  });

  $("linksBody")?.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-link-action]");
    if (!button) return;
    const id = Number(button.dataset.id);
    const action = button.dataset.linkAction;
    if (!id) return;

    try {
      const link = await getAdminLink(id);
      if (action === "edit") {
        openLinkModal(link);
        return;
      }
      if (action === "toggle") {
        await api(`/api/admin/links/${id}`, {
          method: "PUT",
          body: JSON.stringify({
            name: link.name,
            url: link.url,
            description: link.description || "",
            icon: link.icon || "",
            sort_order: link.sort_order,
            is_active: Number(link.is_active) === 1 ? 0 : 1
          })
        });
        showMessage($("linkMessage"), "Government link status updated.", "success");
        await refreshAll();
        return;
      }
      if (action === "delete") {
        if (!window.confirm(`Delete “${link.name}”? This cannot be undone.`)) return;
        await api(`/api/admin/links/${id}`, { method: "DELETE" });
        showMessage($("linkMessage"), "Government link deleted.", "success");
        await refreshAll();
      }
    } catch (error) {
      showMessage($("linkMessage"), error.message || "Action failed.");
    }
  });

  $("linkForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const save = $("saveLinkButton");
    const id = $("linkId").value.trim();
    const payload = {
      name: $("linkName").value.trim(),
      url: $("linkUrl").value.trim(),
      description: $("linkDescription").value.trim(),
      icon: $("linkIcon").value.trim(),
      sort_order: Number($("linkSort").value || 0),
      is_active: $("linkActive").checked ? 1 : 0
    };

    save.disabled = true;
    showMessage($("linkFormMessage"), "Saving…", "success");
    try {
      await api(id ? `/api/admin/links/${id}` : "/api/admin/links", {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(payload)
      });
      closeLinkModal();
      showMessage($("linkMessage"), id ? "Government link updated successfully." : "Government link added successfully.", "success");
      await refreshAll();
    } catch (error) {
      showMessage($("linkFormMessage"), error.message || "Unable to save government link.");
    } finally {
      save.disabled = false;
    }
  });

  async function loadSettings() {
    try {
      const result = await api("/api/admin/settings");
      const settings = result.data.settings || {};
      $("siteTitle").value = settings.site_title || "";
      $("siteSubtitle").value = settings.site_subtitle || "";
      $("footerText").value = settings.footer_text || "";
    } catch (error) {
      if (error.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      showMessage($("settingsMessage"), error.message || "Unable to load website settings.");
    }
  }

  $("settingsForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = $("saveSettingsButton");
    const payload = {
      site_title: $("siteTitle").value.trim(),
      site_subtitle: $("siteSubtitle").value.trim(),
      footer_text: $("footerText").value.trim()
    };

    button.disabled = true;
    showMessage($("settingsMessage"), "Saving…", "success");
    try {
      const result = await api("/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify(payload)
      });
      const settings = result.data.settings || payload;
      $("siteTitle").value = settings.site_title || "";
      $("siteSubtitle").value = settings.site_subtitle || "";
      $("footerText").value = settings.footer_text || "";
      showMessage($("settingsMessage"), "Website settings saved successfully.", "success");
    } catch (error) {
      if (error.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      showMessage($("settingsMessage"), error.message || "Unable to save website settings.");
    } finally {
      button.disabled = false;
    }
  });

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
