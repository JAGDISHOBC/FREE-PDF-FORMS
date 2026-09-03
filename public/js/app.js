"use strict";

const state = {
  departments: [],
  forms: [],
  links: [],
  selectedDepartment: null
};

const departmentIcons = {
  "School Forms": "🏫",
  "SDM / Tehsil Office": "🏛️",
  "ICDS Forms": "📋",
  "Anganwadi Forms": "👩‍👧",
  "College Forms": "🎓",
  "Other Forms": "📁"
};

document.addEventListener("DOMContentLoaded", () => {
  loadPageData();

  const searchButton = document.getElementById("searchButton");
  const searchInput = document.getElementById("searchInput");

  if (searchButton) {
    searchButton.addEventListener("click", handleSearch);
  }

  if (searchInput) {
    searchInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        handleSearch();
      }
    });
  }

  const year = document.getElementById("currentYear");
  if (year) {
    year.textContent = new Date().getFullYear();
  }
});


async function loadPageData() {
  await Promise.all([
    loadDepartments(),
    loadForms(),
    loadGovernmentLinks(),
    loadSettings()
  ]);
}


/* -------------------------
   Departments
------------------------- */

async function loadDepartments() {
  const container = document.getElementById("departmentsGrid");

  if (!container) return;

  try {
    const response = await fetch("/api/departments");

    if (!response.ok) {
      throw new Error("Departments request failed");
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error("Departments API returned an error");
    }

    state.departments = Array.isArray(result.data)
      ? result.data
      : [];

    renderDepartments();
  } catch (error) {
    console.error(error);

    container.innerHTML = `
      <div class="empty-card">
        <div class="empty-icon">⚠️</div>
        <h3>Unable to load departments</h3>
        <p>Please refresh the page and try again.</p>
      </div>
    `;
  }
}


function renderDepartments() {
  const container = document.getElementById("departmentsGrid");

  if (!container) return;

  if (state.departments.length === 0) {
    container.innerHTML = `
      <div class="empty-card">
        <div class="empty-icon">📂</div>
        <h3>No departments available</h3>
        <p>Departments will appear here when available.</p>
      </div>
    `;

    return;
  }

  container.innerHTML = state.departments
    .map((department) => {
      const icon =
        department.icon ||
        departmentIcons[department.name] ||
        "📁";

      const description =
        department.description ||
        "View available forms from this department.";

      return `
        <a
          href="#forms"
          class="department-card"
          data-department-id="${escapeAttribute(department.id)}"
        >
          <div class="department-icon">${escapeHtml(icon)}</div>

          <h3>${escapeHtml(department.name)}</h3>

          <p>${escapeHtml(description)}</p>

          <span class="department-arrow">
            View Forms →
          </span>
        </a>
      `;
    })
    .join("");

  container
    .querySelectorAll(".department-card")
    .forEach((card) => {
      card.addEventListener("click", async (event) => {
        event.preventDefault();

        const departmentId = card.dataset.departmentId;

        if (!departmentId) return;

        state.selectedDepartment = departmentId;

        await loadForms(departmentId);

        const formsSection = document.getElementById("forms");

        if (formsSection) {
          formsSection.scrollIntoView({
            behavior: "smooth"
          });
        }
      });
    });
}


/* -------------------------
   Forms
------------------------- */

async function loadForms(departmentId = null, search = "") {
  const container = document.getElementById("formsGrid");

  if (!container) return;

  try {
    container.innerHTML = `
      <div class="loading-card">
        Loading forms...
      </div>
    `;

    const params = new URLSearchParams();

    if (departmentId) {
      params.set("department_id", departmentId);
    }

    if (search) {
      params.set("search", search);
    }

    const queryString = params.toString();

    const url = queryString
      ? `/api/forms?${queryString}`
      : "/api/forms";

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Forms request failed");
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error("Forms API returned an error");
    }

    state.forms = Array.isArray(result.data)
      ? result.data
      : [];

    renderForms();
  } catch (error) {
    console.error(error);

    container.innerHTML = `
      <div class="empty-card">
        <div class="empty-icon">⚠️</div>
        <h3>Unable to load forms</h3>
        <p>Please refresh the page and try again.</p>
      </div>
    `;
  }
}


function renderForms() {
  const container = document.getElementById("formsGrid");

  if (!container) return;

  if (state.forms.length === 0) {
    container.innerHTML = `
      <div class="empty-card">
        <div class="empty-icon">📄</div>
        <h3>No forms found</h3>
        <p>
          Forms added from the admin panel will appear here.
        </p>
      </div>
    `;

    return;
  }

  container.innerHTML = state.forms
    .map((form) => {
      const description =
        form.description ||
        "Download this PDF form.";

      return `
        <article class="form-card">

          <h3>${escapeHtml(form.name || "PDF Form")}</h3>

          <p>${escapeHtml(description)}</p>

          <div class="form-actions">

            <a
              class="small-btn small-btn-primary"
              href="/pdf/${encodeURIComponent(form.id)}"
              target="_blank"
              rel="noopener"
            >
              Preview
            </a>

            <a
              class="small-btn small-btn-secondary"
              href="/download/${encodeURIComponent(form.id)}"
            >
              Download
            </a>

          </div>

        </article>
      `;
    })
    .join("");
}


/* -------------------------
   Government Links
------------------------- */

async function loadGovernmentLinks() {
  const container = document.getElementById("linksGrid");

  if (!container) return;

  try {
    const response = await fetch("/api/links");

    if (!response.ok) {
      throw new Error("Government links request failed");
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error("Government links API returned an error");
    }

    state.links = Array.isArray(result.data)
      ? result.data
      : [];

    renderGovernmentLinks();
  } catch (error) {
    console.error(error);

    container.innerHTML = `
      <div class="empty-card">
        <div class="empty-icon">⚠️</div>
        <h3>Unable to load links</h3>
        <p>Please refresh the page and try again.</p>
      </div>
    `;
  }
}


function renderGovernmentLinks() {
  const container = document.getElementById("linksGrid");

  if (!container) return;

  if (state.links.length === 0) {
    container.innerHTML = `
      <div class="empty-card">
        <div class="empty-icon">🔗</div>
        <h3>No government links available</h3>
        <p>
          Government links added from the admin panel
          will appear here.
        </p>
      </div>
    `;

    return;
  }

  container.innerHTML = state.links
    .map((link) => {
      const icon = link.icon || "🔗";

      return `
        <a
          class="link-card"
          href="${escapeAttribute(link.url)}"
          target="_blank"
          rel="noopener noreferrer"
        >
          <div class="link-icon">${escapeHtml(icon)}</div>

          <h3>${escapeHtml(link.name || "Government Resource")}</h3>

          <p>
            ${escapeHtml(
              link.description ||
              "Visit this government resource."
            )}
          </p>

          <span>Visit Website →</span>
        </a>
      `;
    })
    .join("");
}


/* -------------------------
   Site Settings
------------------------- */

async function loadSettings() {
  try {
    const response = await fetch("/api/settings", {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("Settings request failed");
    }

    const result = await response.json();

    if (!result.success || !result.data) {
      return;
    }

    const settings = result.data;

    const siteTitle = settings.site_title || "";
    const siteSubtitle = settings.site_subtitle || "";
    const footerText = settings.footer_text || "";

    const footerTitle =
      document.getElementById("footerTitle");

    const footerSubtitle =
      document.getElementById("footerSubtitle");

    if (siteTitle) {
      document.title = siteTitle;

      if (footerTitle) {
        footerTitle.textContent = siteTitle;
      }
    }

    if (siteSubtitle && footerSubtitle) {
      footerSubtitle.textContent = siteSubtitle;
    }

    const footerBottom =
      document.querySelector(".footer-bottom p");

    if (footerText && footerBottom) {
      const yearElement =
        document.getElementById("currentYear");

      const year =
        yearElement?.textContent ||
        new Date().getFullYear();

      footerBottom.textContent =
        `© ${year} ${footerText}`;
    }
  } catch (error) {
    console.error("Settings load error:", error);
  }
}


/* -------------------------
   Search
------------------------- */

async function handleSearch() {
  const input = document.getElementById("searchInput");

  if (!input) return;

  const searchTerm = input.value.trim();

  state.selectedDepartment = null;

  await loadForms(null, searchTerm);

  const formsSection = document.getElementById("forms");

  if (formsSection) {
    formsSection.scrollIntoView({
      behavior: "smooth"
    });
  }
}


/* -------------------------
   Security Helpers
------------------------- */

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function escapeAttribute(value) {
  return escapeHtml(value);
}