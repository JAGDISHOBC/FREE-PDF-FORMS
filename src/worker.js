/**
 * Free PDF Forms & Government Resources
 * Cloudflare Worker
 *
 * Phase 1:
 * - D1 database connection
 * - R2 PDF storage connection
 * - Public API foundation
 * - PDF preview/download routes
 * - Health check
 * - Static asset serving
 */

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      const path = url.pathname;

      // --------------------------------------------------
      // CORS / Common headers
      // --------------------------------------------------

      const commonHeaders = {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "SAMEORIGIN",
        "Referrer-Policy": "strict-origin-when-cross-origin"
      };

      // --------------------------------------------------
      // OPTIONS / CORS preflight
      // --------------------------------------------------

      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: {
            ...commonHeaders,
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization"
          }
        });
      }

      // --------------------------------------------------
      // Health check
      // --------------------------------------------------

      if (path === "/api/health" && request.method === "GET") {
        return jsonResponse({
          success: true,
          message: "Free PDF Forms Worker is running.",
          timestamp: new Date().toISOString()
        }, 200, commonHeaders);
      }

      // --------------------------------------------------
      // Public API routes
      // --------------------------------------------------

      if (path === "/api/departments" && request.method === "GET") {
        return await getDepartments(env, commonHeaders);
      }

      if (path === "/api/forms" && request.method === "GET") {
        return await getForms(env, commonHeaders, url);
      }

      if (path === "/api/links" && request.method === "GET") {
        return await getGovernmentLinks(env, commonHeaders);
      }

      if (path === "/api/settings" && request.method === "GET") {
        return await getSiteSettings(env, commonHeaders);
      }

      if (path === "/api/tools" && request.method === "GET") {
        return await getPublicTools(env, commonHeaders);
      }

      // --------------------------------------------------
      // Individual form information
      // --------------------------------------------------

      const formMatch = path.match(/^\/api\/forms\/([0-9]+)$/);

      if (formMatch && request.method === "GET") {
        const formId = Number(formMatch[1]);

        return await getSingleForm(
          env,
          commonHeaders,
          formId
        );
      }

      // --------------------------------------------------
      // PDF preview
      //
      // /pdf/123
      // --------------------------------------------------

      const previewMatch = path.match(/^\/pdf\/([0-9]+)$/);

      if (previewMatch && request.method === "GET") {
        const formId = Number(previewMatch[1]);

        return await servePdf(
          env,
          commonHeaders,
          formId,
          "inline"
        );
      }

      // --------------------------------------------------
      // PDF download
      //
      // /download/123
      // --------------------------------------------------

      const downloadMatch = path.match(/^\/download\/([0-9]+)$/);

      if (downloadMatch && request.method === "GET") {
        const formId = Number(downloadMatch[1]);

        return await servePdf(
          env,
          commonHeaders,
          formId,
          "attachment"
        );
      }


      // --------------------------------------------------
      // Passport Photo AI endpoints
      // --------------------------------------------------

      if (path === "/api/ai/passport" && request.method === "POST") {
        return await handlePassportAI(request, env, commonHeaders);
      }

      if (path === "/api/ai/status" && request.method === "GET") {
        return await getPassportAIStatus(request, env, commonHeaders);
      }

      // --------------------------------------------------
      // Admin authentication API
      // --------------------------------------------------

      if (path === "/api/admin/login" && request.method === "POST") {
        return await handleAdminLogin(request, env, commonHeaders);
      }

      if (path === "/api/admin/logout" && request.method === "POST") {
        return await handleAdminLogout(request, env, commonHeaders);
      }

      if (path === "/api/admin/me" && request.method === "GET") {
        return await handleAdminMe(request, env, commonHeaders);
      }

      if (path === "/api/admin/dashboard" && request.method === "GET") {
        return await handleAdminDashboard(request, env, commonHeaders);
      }

      if (path === "/api/admin/settings" && request.method === "GET") {
        return await handleAdminSettingsGet(request, env, commonHeaders);
      }

      if (path === "/api/admin/settings" && request.method === "PUT") {
        return await handleAdminSettingsUpdate(request, env, commonHeaders);
      }

      if (path === "/api/admin/tools" && request.method === "GET") {
        return await handleAdminToolsList(request, env, commonHeaders, url);
      }

      if (path === "/api/admin/tools" && request.method === "POST") {
        return await handleAdminToolCreate(request, env, commonHeaders);
      }

      if (path === "/api/admin/departments" && request.method === "GET") {
        return await handleAdminDepartmentsList(request, env, commonHeaders);
      }

      if (path === "/api/admin/departments" && request.method === "POST") {
        return await handleAdminDepartmentCreate(request, env, commonHeaders);
      }

      if (path === "/api/admin/forms" && request.method === "GET") {
        return await handleAdminFormsList(request, env, commonHeaders, url);
      }

      if (path === "/api/admin/forms" && request.method === "POST") {
        return await handleAdminFormCreate(request, env, commonHeaders);
      }

      if (path === "/api/admin/links" && request.method === "GET") {
        return await handleAdminLinksList(request, env, commonHeaders);
      }

      if (path === "/api/admin/links" && request.method === "POST") {
        return await handleAdminLinkCreate(request, env, commonHeaders);
      }

      const adminLinkMatch = path.match(/^\/api\/admin\/links\/([0-9]+)$/);

      if (adminLinkMatch) {
        const linkId = Number(adminLinkMatch[1]);

        if (request.method === "GET") {
          return await handleAdminLinkGet(request, env, commonHeaders, linkId);
        }

        if (request.method === "PUT") {
          return await handleAdminLinkUpdate(request, env, commonHeaders, linkId);
        }

        if (request.method === "DELETE") {
          return await handleAdminLinkDelete(request, env, commonHeaders, linkId);
        }
      }

      const adminFormMatch = path.match(/^\/api\/admin\/forms\/([0-9]+)$/);

      if (adminFormMatch) {
        const formId = Number(adminFormMatch[1]);

        if (request.method === "GET") {
          return await handleAdminFormGet(request, env, commonHeaders, formId);
        }

        if (request.method === "PUT") {
          return await handleAdminFormUpdate(request, env, commonHeaders, formId);
        }

        if (request.method === "DELETE") {
          return await handleAdminFormDelete(request, env, commonHeaders, formId);
        }
      }

      const adminToolMatch = path.match(/^\/api\/admin\/tools\/([0-9]+)$/);

      if (adminToolMatch) {
        const toolId = Number(adminToolMatch[1]);
        if (request.method === "GET") return await handleAdminToolGet(request, env, commonHeaders, toolId);
        if (request.method === "PUT") return await handleAdminToolUpdate(request, env, commonHeaders, toolId);
        if (request.method === "DELETE") return await handleAdminToolDelete(request, env, commonHeaders, toolId);
      }

      const adminDepartmentMatch = path.match(/^\/api\/admin\/departments\/([0-9]+)$/);

      if (adminDepartmentMatch) {
        const departmentId = Number(adminDepartmentMatch[1]);

        if (request.method === "PUT") {
          return await handleAdminDepartmentUpdate(request, env, commonHeaders, departmentId);
        }

        if (request.method === "DELETE") {
          return await handleAdminDepartmentDelete(request, env, commonHeaders, departmentId);
        }
      }

      // --------------------------------------------------
      // Admin panel routes
      // --------------------------------------------------

      if (path === "/admin" || path === "/admin/") {
        return await serveAdminPage(request, env, Boolean(await getAdminSession(request, env)));
      }

      // Keep both common login URLs working without redirects.
      if (path === "/admin/login" || path === "/admin/login/") {
        return await serveAdminPage(request, env, false);
      }

      // Protect the dashboard asset itself so an unauthenticated user
      // cannot bypass the /admin gate by opening the asset URL directly.
      if (path === "/__admin/dashboard.html") {
        const session = await getAdminSession(request, env);
        if (!session) {
          return await serveAdminPage(request, env, false);
        }
        return await serveAdminAsset(request, env, "/__admin/dashboard.html");
      }

      // --------------------------------------------------
      // Public online tool access control
      // --------------------------------------------------
      // Only exact /tools/<slug> and /tools/<slug>/ page requests
      // are checked here. Child assets such as app.js/css continue
      // through the normal Static Assets handler.
      const publicToolMatch = path.match(/^\/tools\/([a-z0-9]+(?:-[a-z0-9]+)*)(?:\/)?$/);

      if (publicToolMatch && request.method === "GET") {
        const toolSlug = publicToolMatch[1];
        return await servePublicToolPage(request, env, commonHeaders, toolSlug);
      }

      // --------------------------------------------------
      // API 404
      // --------------------------------------------------

      if (path.startsWith("/api/")) {
        return jsonResponse({
          success: false,
          error: "API endpoint not found."
        }, 404, commonHeaders);
      }

      // --------------------------------------------------
      // Static website assets
      // --------------------------------------------------

      if (env.ASSETS) {
        return await env.ASSETS.fetch(request);
      }

      // --------------------------------------------------
      // Final fallback
      // --------------------------------------------------

      return new Response("Page not found.", {
        status: 404,
        headers: {
          ...commonHeaders,
          "Content-Type": "text/plain; charset=UTF-8"
        }
      });

    } catch (error) {
      console.error("Worker error:", error);

      return jsonResponse({
        success: false,
        error: "Something went wrong. Please try again later."
      }, 500, {
        "X-Content-Type-Options": "nosniff"
      });
    }
  }
};



// ======================================================
// ADMIN AUTHENTICATION
// ======================================================

const ADMIN_SESSION_COOKIE = "admin_session";
const ADMIN_SESSION_HOURS = 8;

async function handleAdminLogin(request, env, commonHeaders) {
  try {
    if (!env.ADMIN_PASSWORD) {
      return jsonResponse({
        success: false,
        code: "ADMIN_NOT_CONFIGURED",
        error: "Admin login is not configured."
      }, 503, commonHeaders);
    }

    let username = "";
    let password = "";

    const contentType = request.headers.get("Content-Type") || "";

    if (contentType.includes("application/json")) {
      let body;
      try {
        body = await request.json();
      } catch {
        return jsonResponse({
          success: false,
          code: "INVALID_REQUEST",
          error: "Invalid login request."
        }, 400, commonHeaders);
      }

      username = String(body?.username || "").trim();
      password = String(body?.password || "");
    } else if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      username = String(form.get("username") || "").trim();
      password = String(form.get("password") || "");
    } else {
      return jsonResponse({
        success: false,
        code: "INVALID_REQUEST",
        error: "Invalid login request."
      }, 400, commonHeaders);
    }

    if (!username || !password) {
      return jsonResponse({
        success: false,
        code: "MISSING_CREDENTIALS",
        error: "Username and password are required."
      }, 400, commonHeaders);
    }

    if (username !== "admin") {
      return jsonResponse({
        success: false,
        code: "INVALID_CREDENTIALS",
        error: "Invalid username or password."
      }, 401, commonHeaders);
    }

    const passwordMatches = await secureSecretCompare(
      password,
      env.ADMIN_PASSWORD
    );

    if (!passwordMatches) {
      return jsonResponse({
        success: false,
        code: "INVALID_CREDENTIALS",
        error: "Invalid username or password."
      }, 401, commonHeaders);
    }

    const passwordHash = await sha256Hex(password);

    const existingUser = await env.DB.prepare(`
      SELECT id
      FROM admin_users
      WHERE username = ?
      LIMIT 1
    `).bind(username).first();

    let userId;

    if (existingUser) {
      userId = Number(existingUser.id);

      await env.DB.prepare(`
        UPDATE admin_users
        SET password_hash = ?, is_active = 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(passwordHash, userId).run();
    } else {
      const created = await env.DB.prepare(`
        INSERT INTO admin_users (username, password_hash, is_active)
        VALUES (?, ?, 1)
        RETURNING id
      `).bind(username, passwordHash).first();

      userId = Number(created?.id || 0);
    }

    if (!userId) {
      throw new Error("Unable to create admin user.");
    }

    await env.DB.prepare(`
      DELETE FROM admin_sessions
      WHERE user_id = ? OR expires_at <= ?
    `).bind(userId, new Date().toISOString()).run();

    const token = createRandomToken();
    const tokenHash = await sha256Hex(token);
    const expiresAt = new Date(
      Date.now() + ADMIN_SESSION_HOURS * 60 * 60 * 1000
    ).toISOString();

    await env.DB.prepare(`
      INSERT INTO admin_sessions
        (user_id, token_hash, expires_at)
      VALUES (?, ?, ?)
    `).bind(userId, tokenHash, expiresAt).run();

    const headers = new Headers(commonHeaders);
    headers.append(
      "Set-Cookie",
      buildAdminCookie(token, ADMIN_SESSION_HOURS * 60 * 60)
    );
    headers.set("Cache-Control", "no-store");

    // Normal HTML form submissions are redirected by the server itself.
    // This makes the authenticated navigation deterministic and avoids
    // relying on a JavaScript fetch followed by a separate navigation.
    if (!contentType.includes("application/json")) {
      headers.set("Location", "/admin");
      return new Response(null, { status: 303, headers });
    }

    return jsonResponse({
      success: true,
      message: "Login successful.",
      data: {
        username,
        expiresAt
      }
    }, 200, headers);

  } catch (error) {
    console.error("Admin login error:", error);

    return jsonResponse({
      success: false,
      error: "Unable to complete admin login."
    }, 500, commonHeaders);
  }
}


async function handleAdminLogout(request, env, commonHeaders) {
  try {
    const token = getAdminCookie(request);

    if (token) {
      const tokenHash = await sha256Hex(token);

      await env.DB.prepare(`
        DELETE FROM admin_sessions
        WHERE token_hash = ?
      `).bind(tokenHash).run();
    }

    const headers = new Headers(commonHeaders);
    headers.append("Set-Cookie", clearAdminCookie());
    headers.set("Cache-Control", "no-store");

    return jsonResponse({
      success: true,
      message: "Logged out successfully."
    }, 200, headers);

  } catch (error) {
    console.error("Admin logout error:", error);

    const headers = new Headers(commonHeaders);
    headers.append("Set-Cookie", clearAdminCookie());

    return jsonResponse({
      success: false,
      error: "Unable to complete logout."
    }, 500, headers);
  }
}


async function handleAdminMe(request, env, commonHeaders) {
  const session = await getAdminSession(request, env);

  if (!session) {
    return jsonResponse({
      success: false,
      code: "UNAUTHORIZED",
      error: "Admin login required."
    }, 401, commonHeaders);
  }

  return jsonResponse({
    success: true,
    data: {
      username: session.username,
      expiresAt: session.expires_at
    }
  }, 200, {
    ...commonHeaders,
    "Cache-Control": "no-store"
  });
}


async function handleAdminDashboard(request, env, commonHeaders) {
  const session = await getAdminSession(request, env);

  if (!session) {
    return jsonResponse({
      success: false,
      code: "UNAUTHORIZED",
      error: "Admin login required."
    }, 401, commonHeaders);
  }

  try {
    const [departments, forms, links, tools] = await Promise.all([
      env.DB.prepare("SELECT COUNT(*) AS count FROM departments").first(),
      env.DB.prepare("SELECT COUNT(*) AS count FROM forms").first(),
      env.DB.prepare("SELECT COUNT(*) AS count FROM government_links").first(),
      env.DB.prepare("SELECT COUNT(*) AS count FROM tools").first()
    ]);

    return jsonResponse({
      success: true,
      data: {
        departments: Number(departments?.count || 0),
        forms: Number(forms?.count || 0),
        governmentLinks: Number(links?.count || 0),
        tools: Number(tools?.count || 0)
      }
    }, 200, {
      ...commonHeaders,
      "Cache-Control": "no-store"
    });

  } catch (error) {
    console.error("Admin dashboard error:", error);

    return jsonResponse({
      success: false,
      error: "Unable to load dashboard."
    }, 500, commonHeaders);
  }
}


async function handleAdminDepartmentsList(request, env, commonHeaders) {
  const session = await getAdminSession(request, env);

  if (!session) {
    return jsonResponse({
      success: false,
      code: "UNAUTHORIZED",
      error: "Admin login required."
    }, 401, commonHeaders);
  }

  try {
    const result = await env.DB.prepare(`
      SELECT
        d.id,
        d.name,
        d.description,
        d.icon,
        d.sort_order,
        d.is_active,
        d.created_at,
        d.updated_at,
        (SELECT COUNT(*) FROM forms f WHERE f.department_id = d.id) AS form_count
      FROM departments d
      ORDER BY d.sort_order ASC, d.id ASC
    `).all();

    return jsonResponse({
      success: true,
      data: {
        departments: result.results || []
      }
    }, 200, {
      ...commonHeaders,
      "Cache-Control": "no-store"
    });
  } catch (error) {
    console.error("Admin departments list error:", error);
    return jsonResponse({
      success: false,
      error: "Unable to load departments."
    }, 500, commonHeaders);
  }
}


async function readDepartmentPayload(request) {
  const contentType = request.headers.get("Content-Type") || "";
  if (!contentType.includes("application/json")) {
    return { error: "JSON request body is required." };
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return { error: "Invalid JSON request." };
  }

  const name = String(body?.name ?? "").trim();
  const description = String(body?.description ?? "").trim();
  const icon = String(body?.icon ?? "").trim();

  const rawSort = body?.sort_order;
  const sort_order = Number.isFinite(Number(rawSort)) ? Math.trunc(Number(rawSort)) : 0;

  const rawActive = body?.is_active;
  const is_active = rawActive === false || rawActive === 0 || rawActive === "0" ? 0 : 1;

  if (!name) {
    return { error: "Department name is required." };
  }
  if (name.length > 150) {
    return { error: "Department name must be 150 characters or fewer." };
  }
  if (description.length > 500) {
    return { error: "Description must be 500 characters or fewer." };
  }
  if (icon.length > 20) {
    return { error: "Icon must be 20 characters or fewer." };
  }
  if (sort_order < 0 || sort_order > 999999) {
    return { error: "Sort order must be between 0 and 999999." };
  }

  return { data: { name, description, icon, sort_order, is_active } };
}


async function handleAdminDepartmentCreate(request, env, commonHeaders) {
  const session = await getAdminSession(request, env);
  if (!session) {
    return jsonResponse({
      success: false,
      code: "UNAUTHORIZED",
      error: "Admin login required."
    }, 401, commonHeaders);
  }

  try {
    const payload = await readDepartmentPayload(request);
    if (payload.error) {
      return jsonResponse({ success: false, error: payload.error }, 400, commonHeaders);
    }

    const duplicate = await env.DB.prepare(`
      SELECT id FROM departments WHERE lower(name) = lower(?) LIMIT 1
    `).bind(payload.data.name).first();

    if (duplicate) {
      return jsonResponse({
        success: false,
        code: "DUPLICATE_NAME",
        error: "A department with this name already exists."
      }, 409, commonHeaders);
    }

    const result = await env.DB.prepare(`
      INSERT INTO departments (name, description, icon, sort_order, is_active)
      VALUES (?, ?, ?, ?, ?)
      RETURNING id, name, description, icon, sort_order, is_active, created_at, updated_at
    `).bind(
      payload.data.name,
      payload.data.description,
      payload.data.icon,
      payload.data.sort_order,
      payload.data.is_active
    ).first();

    return jsonResponse({
      success: true,
      message: "Department created successfully.",
      data: { department: result }
    }, 201, { ...commonHeaders, "Cache-Control": "no-store" });
  } catch (error) {
    console.error("Admin department create error:", error);
    return jsonResponse({
      success: false,
      error: "Unable to create department."
    }, 500, commonHeaders);
  }
}


async function handleAdminDepartmentUpdate(request, env, commonHeaders, departmentId) {
  const session = await getAdminSession(request, env);
  if (!session) {
    return jsonResponse({
      success: false,
      code: "UNAUTHORIZED",
      error: "Admin login required."
    }, 401, commonHeaders);
  }

  if (!Number.isInteger(departmentId) || departmentId < 1) {
    return jsonResponse({ success: false, error: "Invalid department ID." }, 400, commonHeaders);
  }

  try {
    const payload = await readDepartmentPayload(request);
    if (payload.error) {
      return jsonResponse({ success: false, error: payload.error }, 400, commonHeaders);
    }

    const existing = await env.DB.prepare(`
      SELECT id FROM departments WHERE id = ? LIMIT 1
    `).bind(departmentId).first();

    if (!existing) {
      return jsonResponse({
        success: false,
        code: "NOT_FOUND",
        error: "Department not found."
      }, 404, commonHeaders);
    }

    const duplicate = await env.DB.prepare(`
      SELECT id FROM departments
      WHERE lower(name) = lower(?) AND id != ?
      LIMIT 1
    `).bind(payload.data.name, departmentId).first();

    if (duplicate) {
      return jsonResponse({
        success: false,
        code: "DUPLICATE_NAME",
        error: "A department with this name already exists."
      }, 409, commonHeaders);
    }

    const result = await env.DB.prepare(`
      UPDATE departments
      SET name = ?,
          description = ?,
          icon = ?,
          sort_order = ?,
          is_active = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      RETURNING id, name, description, icon, sort_order, is_active, created_at, updated_at
    `).bind(
      payload.data.name,
      payload.data.description,
      payload.data.icon,
      payload.data.sort_order,
      payload.data.is_active,
      departmentId
    ).first();

    return jsonResponse({
      success: true,
      message: "Department updated successfully.",
      data: { department: result }
    }, 200, { ...commonHeaders, "Cache-Control": "no-store" });
  } catch (error) {
    console.error("Admin department update error:", error);
    return jsonResponse({
      success: false,
      error: "Unable to update department."
    }, 500, commonHeaders);
  }
}


async function handleAdminDepartmentDelete(request, env, commonHeaders, departmentId) {
  const session = await getAdminSession(request, env);
  if (!session) {
    return jsonResponse({
      success: false,
      code: "UNAUTHORIZED",
      error: "Admin login required."
    }, 401, commonHeaders);
  }

  if (!Number.isInteger(departmentId) || departmentId < 1) {
    return jsonResponse({ success: false, error: "Invalid department ID." }, 400, commonHeaders);
  }

  try {
    const department = await env.DB.prepare(`
      SELECT id, name FROM departments WHERE id = ? LIMIT 1
    `).bind(departmentId).first();

    if (!department) {
      return jsonResponse({
        success: false,
        code: "NOT_FOUND",
        error: "Department not found."
      }, 404, commonHeaders);
    }

    const formCount = await env.DB.prepare(`
      SELECT COUNT(*) AS count FROM forms WHERE department_id = ?
    `).bind(departmentId).first();

    const count = Number(formCount?.count || 0);
    if (count > 0) {
      return jsonResponse({
        success: false,
        code: "HAS_FORMS",
        error: `This department contains ${count} PDF form${count === 1 ? "" : "s"}. Move or delete those forms before deleting the department.`
      }, 409, commonHeaders);
    }

    await env.DB.prepare(`
      DELETE FROM departments WHERE id = ?
    `).bind(departmentId).run();

    return jsonResponse({
      success: true,
      message: "Department deleted successfully."
    }, 200, { ...commonHeaders, "Cache-Control": "no-store" });
  } catch (error) {
    console.error("Admin department delete error:", error);
    return jsonResponse({
      success: false,
      error: "Unable to delete department."
    }, 500, commonHeaders);
  }
}

async function handleAdminLinksList(request, env, commonHeaders) {
  const authError = await requireAdmin(request, env, commonHeaders);
  if (authError) return authError;

  try {
    const result = await env.DB.prepare(`
      SELECT id, name, url, description, icon, sort_order, is_active, created_at, updated_at
      FROM government_links
      ORDER BY sort_order ASC, id ASC
    `).all();

    return jsonResponse({
      success: true,
      data: { links: result.results || [] }
    }, 200, { ...commonHeaders, "Cache-Control": "no-store" });
  } catch (error) {
    console.error("Admin government links list error:", error);
    return jsonResponse({ success: false, error: "Unable to load government links." }, 500, commonHeaders);
  }
}

async function readAdminLinkPayload(request) {
  const contentType = request.headers.get("Content-Type") || "";
  if (!contentType.includes("application/json")) return { error: "JSON request body is required." };

  let body;
  try { body = await request.json(); } catch { return { error: "Invalid JSON request." }; }

  const name = String(body?.name ?? "").trim();
  const url = String(body?.url ?? "").trim();
  const description = String(body?.description ?? "").trim();
  const icon = String(body?.icon ?? "").trim();
  const sort_order = Number.isFinite(Number(body?.sort_order)) ? Math.trunc(Number(body.sort_order)) : 0;
  const is_active = body?.is_active === false || body?.is_active === 0 || body?.is_active === "0" ? 0 : 1;

  if (!name) return { error: "Link name is required." };
  if (name.length > 150) return { error: "Link name must be 150 characters or fewer." };
  if (!url) return { error: "URL is required." };
  if (url.length > 2000) return { error: "URL must be 2000 characters or fewer." };
  if (description.length > 500) return { error: "Description must be 500 characters or fewer." };
  if (icon.length > 20) return { error: "Icon must be 20 characters or fewer." };
  if (sort_order < 0 || sort_order > 999999) return { error: "Sort order must be between 0 and 999999." };

  let parsed;
  try { parsed = new URL(url); } catch { return { error: "Enter a valid URL." }; }
  if (!(parsed.protocol === "https:" || parsed.protocol === "http:")) {
    return { error: "Only http:// and https:// URLs are allowed." };
  }
  if (!parsed.hostname) return { error: "Enter a valid URL." };

  return { data: { name, url: parsed.toString(), description, icon, sort_order, is_active } };
}

async function handleAdminLinkCreate(request, env, commonHeaders) {
  const authError = await requireAdmin(request, env, commonHeaders);
  if (authError) return authError;

  try {
    const payload = await readAdminLinkPayload(request);
    if (payload.error) return jsonResponse({ success: false, error: payload.error }, 400, commonHeaders);

    const duplicate = await env.DB.prepare(`
      SELECT id FROM government_links
      WHERE lower(name) = lower(?) OR lower(url) = lower(?)
      LIMIT 1
    `).bind(payload.data.name, payload.data.url).first();

    if (duplicate) {
      return jsonResponse({
        success: false,
        code: "DUPLICATE_LINK",
        error: "A government link with the same name or URL already exists."
      }, 409, commonHeaders);
    }

    const result = await env.DB.prepare(`
      INSERT INTO government_links (name, url, description, icon, sort_order, is_active)
      VALUES (?, ?, ?, ?, ?, ?)
      RETURNING id, name, url, description, icon, sort_order, is_active, created_at, updated_at
    `).bind(
      payload.data.name,
      payload.data.url,
      payload.data.description,
      payload.data.icon,
      payload.data.sort_order,
      payload.data.is_active
    ).first();

    return jsonResponse({
      success: true,
      message: "Government link created successfully.",
      data: { link: result }
    }, 201, { ...commonHeaders, "Cache-Control": "no-store" });
  } catch (error) {
    console.error("Admin government link create error:", error);
    return jsonResponse({ success: false, error: "Unable to create government link." }, 500, commonHeaders);
  }
}

async function handleAdminLinkGet(request, env, commonHeaders, linkId) {
  const authError = await requireAdmin(request, env, commonHeaders);
  if (authError) return authError;
  if (!Number.isInteger(linkId) || linkId < 1) return jsonResponse({ success: false, error: "Invalid link ID." }, 400, commonHeaders);

  try {
    const link = await env.DB.prepare(`
      SELECT id, name, url, description, icon, sort_order, is_active, created_at, updated_at
      FROM government_links WHERE id = ? LIMIT 1
    `).bind(linkId).first();

    if (!link) return jsonResponse({ success: false, code: "NOT_FOUND", error: "Government link not found." }, 404, commonHeaders);
    return jsonResponse({ success: true, data: { link } }, 200, { ...commonHeaders, "Cache-Control": "no-store" });
  } catch (error) {
    console.error("Admin government link get error:", error);
    return jsonResponse({ success: false, error: "Unable to load government link." }, 500, commonHeaders);
  }
}

async function handleAdminLinkUpdate(request, env, commonHeaders, linkId) {
  const authError = await requireAdmin(request, env, commonHeaders);
  if (authError) return authError;
  if (!Number.isInteger(linkId) || linkId < 1) return jsonResponse({ success: false, error: "Invalid link ID." }, 400, commonHeaders);

  try {
    const payload = await readAdminLinkPayload(request);
    if (payload.error) return jsonResponse({ success: false, error: payload.error }, 400, commonHeaders);

    const existing = await env.DB.prepare(`SELECT id FROM government_links WHERE id = ? LIMIT 1`).bind(linkId).first();
    if (!existing) return jsonResponse({ success: false, code: "NOT_FOUND", error: "Government link not found." }, 404, commonHeaders);

    const duplicate = await env.DB.prepare(`
      SELECT id FROM government_links
      WHERE (lower(name) = lower(?) OR lower(url) = lower(?)) AND id != ?
      LIMIT 1
    `).bind(payload.data.name, payload.data.url, linkId).first();

    if (duplicate) {
      return jsonResponse({
        success: false,
        code: "DUPLICATE_LINK",
        error: "A government link with the same name or URL already exists."
      }, 409, commonHeaders);
    }

    const result = await env.DB.prepare(`
      UPDATE government_links
      SET name = ?, url = ?, description = ?, icon = ?, sort_order = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      RETURNING id, name, url, description, icon, sort_order, is_active, created_at, updated_at
    `).bind(
      payload.data.name,
      payload.data.url,
      payload.data.description,
      payload.data.icon,
      payload.data.sort_order,
      payload.data.is_active,
      linkId
    ).first();

    return jsonResponse({
      success: true,
      message: "Government link updated successfully.",
      data: { link: result }
    }, 200, { ...commonHeaders, "Cache-Control": "no-store" });
  } catch (error) {
    console.error("Admin government link update error:", error);
    return jsonResponse({ success: false, error: "Unable to update government link." }, 500, commonHeaders);
  }
}

async function handleAdminLinkDelete(request, env, commonHeaders, linkId) {
  const authError = await requireAdmin(request, env, commonHeaders);
  if (authError) return authError;
  if (!Number.isInteger(linkId) || linkId < 1) return jsonResponse({ success: false, error: "Invalid link ID." }, 400, commonHeaders);

  try {
    const existing = await env.DB.prepare(`SELECT id, name FROM government_links WHERE id = ? LIMIT 1`).bind(linkId).first();
    if (!existing) return jsonResponse({ success: false, code: "NOT_FOUND", error: "Government link not found." }, 404, commonHeaders);

    await env.DB.prepare(`DELETE FROM government_links WHERE id = ?`).bind(linkId).run();

    return jsonResponse({ success: true, message: "Government link deleted successfully." }, 200, { ...commonHeaders, "Cache-Control": "no-store" });
  } catch (error) {
    console.error("Admin government link delete error:", error);
    return jsonResponse({ success: false, error: "Unable to delete government link." }, 500, commonHeaders);
  }
}

async function handleAdminToolsList(request, env, commonHeaders, url) {
  const authError = await requireAdmin(request, env, commonHeaders);
  if (authError) return authError;
  const search = String(url.searchParams.get("search") || "").trim();
  try {
    let query = `SELECT id,name,slug,description,icon,category,sort_order,is_active,show_on_home,is_featured,version,created_at,updated_at,
      (SELECT COUNT(*) FROM tool_settings ts WHERE ts.tool_id=tools.id) AS setting_count FROM tools`;
    const params=[];
    if(search){ query += ` WHERE LOWER(name) LIKE LOWER(?) OR LOWER(slug) LIKE LOWER(?) OR LOWER(category) LIKE LOWER(?)`; const t=`%${search}%`; params.push(t,t,t); }
    query += ` ORDER BY sort_order ASC, id ASC`;
    const result=await env.DB.prepare(query).bind(...params).all();
    return jsonResponse({success:true,data:{tools:result.results||[]}},200,{...commonHeaders,"Cache-Control":"no-store"});
  } catch(error){ console.error("Admin tools list error:",error); return jsonResponse({success:false,error:"Unable to load tools."},500,commonHeaders); }
}

function normalizeToolPayload(body){
  const name=String(body?.name??"").trim(), slug=String(body?.slug??"").trim().toLowerCase();
  const description=String(body?.description??"").trim(), icon=String(body?.icon??"🛠️").trim()||"🛠️";
  const category=String(body?.category??"Other").trim()||"Other", sortOrder=Number(body?.sort_order??0);
  const isActive=Number(body?.is_active)===1?1:0, showOnHome=Number(body?.show_on_home)===1?1:0, isFeatured=Number(body?.is_featured)===1?1:0;
  const version=String(body?.version??"1.0.0").trim()||"1.0.0";
  if(!name) return {error:"Tool name is required."}; if(name.length>150) return {error:"Tool name must be 150 characters or fewer."};
  if(!slug) return {error:"Tool slug is required."}; if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return {error:"Slug may contain lowercase letters, numbers and hyphens only."};
  if(slug.length>120) return {error:"Slug must be 120 characters or fewer."}; if(description.length>1000) return {error:"Description must be 1000 characters or fewer."};
  if(icon.length>20) return {error:"Icon must be 20 characters or fewer."}; if(category.length>80) return {error:"Category must be 80 characters or fewer."};
  if(!Number.isInteger(sortOrder)||sortOrder<0||sortOrder>999999) return {error:"Sort order must be a whole number between 0 and 999999."};
  if(version.length>30) return {error:"Version must be 30 characters or fewer."};
  return {data:{name,slug,description,icon,category,sortOrder,isActive,showOnHome,isFeatured,version}};
}
function normalizeToolSettings(settings){
  if(settings===undefined||settings===null||settings==="") return {data:{}};
  if(typeof settings!=="object"||Array.isArray(settings)) return {error:"Settings must be a JSON object."};
  const entries=Object.entries(settings); if(entries.length>50) return {error:"A tool may have at most 50 settings."};
  for(const [key,value] of entries){
    if(!/^[A-Za-z0-9_.-]{1,100}$/.test(key)) return {error:"Setting keys may contain letters, numbers, dots, underscores and hyphens only."};
    if(!["string","number","boolean"].includes(typeof value)&&value!==null) return {error:`Setting "${key}" must be text, number, boolean or null.`};
    if(typeof value==="string"&&value.length>5000) return {error:`Setting "${key}" is too long.`};
  } return {data:settings};
}
async function getAdminToolRecord(env,id){ return await env.DB.prepare(`SELECT id,name,slug,description,icon,category,sort_order,is_active,show_on_home,is_featured,version,created_at,updated_at FROM tools WHERE id=? LIMIT 1`).bind(id).first(); }
async function getAdminToolSettings(env,id){
  const result=await env.DB.prepare(`SELECT setting_key,setting_value FROM tool_settings WHERE tool_id=? ORDER BY setting_key ASC`).bind(id).all(); const settings={};
  for(const row of result.results||[]){ try{settings[row.setting_key]=JSON.parse(row.setting_value);}catch{settings[row.setting_key]=row.setting_value;} } return settings;
}
async function handleAdminToolCreate(request,env,commonHeaders){
  const authError=await requireAdmin(request,env,commonHeaders); if(authError) return authError;
  try{ const body=await request.json(), payload=normalizeToolPayload(body); if(payload.error) return jsonResponse({success:false,error:payload.error},400,commonHeaders);
    const settings=normalizeToolSettings(body?.settings); if(settings.error) return jsonResponse({success:false,error:settings.error},400,commonHeaders);
    const duplicate=await env.DB.prepare(`SELECT id FROM tools WHERE name=? OR slug=? LIMIT 1`).bind(payload.data.name,payload.data.slug).first(); if(duplicate) return jsonResponse({success:false,error:"A tool with this name or slug already exists."},409,commonHeaders);
    const result=await env.DB.prepare(`INSERT INTO tools (name,slug,description,icon,category,sort_order,is_active,show_on_home,is_featured,version) VALUES (?,?,?,?,?,?,?,?,?,?) RETURNING id,name,slug,description,icon,category,sort_order,is_active,show_on_home,is_featured,version,created_at,updated_at`).bind(payload.data.name,payload.data.slug,payload.data.description,payload.data.icon,payload.data.category,payload.data.sortOrder,payload.data.isActive,payload.data.showOnHome,payload.data.isFeatured,payload.data.version).first();
    if(!result) throw new Error("Tool insert returned no row.");
    for(const [key,value] of Object.entries(settings.data)) await env.DB.prepare(`INSERT INTO tool_settings (tool_id,setting_key,setting_value) VALUES (?,?,?)`).bind(result.id,key,JSON.stringify(value)).run();
    return jsonResponse({success:true,message:"Tool added successfully.",data:{tool:result,settings:settings.data}},201,{...commonHeaders,"Cache-Control":"no-store"});
  }catch(error){ console.error("Admin tool create error:",error); const m=String(error?.message||""); if(m.includes("UNIQUE")||m.includes("constraint")) return jsonResponse({success:false,error:"A tool with this name or slug already exists."},409,commonHeaders); return jsonResponse({success:false,error:"Unable to add tool."},500,commonHeaders); }
}
async function handleAdminToolGet(request,env,commonHeaders,id){
  const authError=await requireAdmin(request,env,commonHeaders); if(authError) return authError; if(!Number.isInteger(id)||id<1) return jsonResponse({success:false,error:"Invalid tool ID."},400,commonHeaders);
  try{const tool=await getAdminToolRecord(env,id); if(!tool) return jsonResponse({success:false,code:"NOT_FOUND",error:"Tool not found."},404,commonHeaders); return jsonResponse({success:true,data:{tool,settings:await getAdminToolSettings(env,id)}},200,{...commonHeaders,"Cache-Control":"no-store"});}catch(error){console.error("Admin tool get error:",error);return jsonResponse({success:false,error:"Unable to load tool."},500,commonHeaders);}
}
async function handleAdminToolUpdate(request,env,commonHeaders,id){
  const authError=await requireAdmin(request,env,commonHeaders); if(authError) return authError; if(!Number.isInteger(id)||id<1) return jsonResponse({success:false,error:"Invalid tool ID."},400,commonHeaders);
  try{const existing=await getAdminToolRecord(env,id); if(!existing) return jsonResponse({success:false,code:"NOT_FOUND",error:"Tool not found."},404,commonHeaders); const body=await request.json(); const payload=normalizeToolPayload(body); if(payload.error) return jsonResponse({success:false,error:payload.error},400,commonHeaders); const settings=normalizeToolSettings(body?.settings); if(settings.error) return jsonResponse({success:false,error:settings.error},400,commonHeaders);
    const duplicate=await env.DB.prepare(`SELECT id FROM tools WHERE (name=? OR slug=?) AND id!=? LIMIT 1`).bind(payload.data.name,payload.data.slug,id).first(); if(duplicate) return jsonResponse({success:false,error:"Another tool with this name or slug already exists."},409,commonHeaders);
    const result=await env.DB.prepare(`UPDATE tools SET name=?,slug=?,description=?,icon=?,category=?,sort_order=?,is_active=?,show_on_home=?,is_featured=?,version=?,updated_at=CURRENT_TIMESTAMP WHERE id=? RETURNING id,name,slug,description,icon,category,sort_order,is_active,show_on_home,is_featured,version,created_at,updated_at`).bind(payload.data.name,payload.data.slug,payload.data.description,payload.data.icon,payload.data.category,payload.data.sortOrder,payload.data.isActive,payload.data.showOnHome,payload.data.isFeatured,payload.data.version,id).first();
    await env.DB.prepare(`DELETE FROM tool_settings WHERE tool_id=?`).bind(id).run(); for(const [key,value] of Object.entries(settings.data)) await env.DB.prepare(`INSERT INTO tool_settings (tool_id,setting_key,setting_value) VALUES (?,?,?)`).bind(id,key,JSON.stringify(value)).run();
    return jsonResponse({success:true,message:"Tool updated successfully.",data:{tool:result,settings:settings.data}},200,{...commonHeaders,"Cache-Control":"no-store"});
  }catch(error){console.error("Admin tool update error:",error);return jsonResponse({success:false,error:"Unable to update tool."},500,commonHeaders);}
}
async function handleAdminToolDelete(request,env,commonHeaders,id){
  const authError=await requireAdmin(request,env,commonHeaders); if(authError) return authError; if(!Number.isInteger(id)||id<1) return jsonResponse({success:false,error:"Invalid tool ID."},400,commonHeaders);
  try{const existing=await getAdminToolRecord(env,id); if(!existing) return jsonResponse({success:false,code:"NOT_FOUND",error:"Tool not found."},404,commonHeaders); await env.DB.prepare(`DELETE FROM tools WHERE id=?`).bind(id).run(); return jsonResponse({success:true,message:"Tool deleted successfully."},200,{...commonHeaders,"Cache-Control":"no-store"});}catch(error){console.error("Admin tool delete error:",error);return jsonResponse({success:false,error:"Unable to delete tool."},500,commonHeaders);}
}

async function handleAdminSettingsGet(request, env, commonHeaders) {
  const authError = await requireAdmin(request, env, commonHeaders);
  if (authError) return authError;

  try {
    const settings = await env.DB.prepare(`
      SELECT id, site_title, site_subtitle, footer_text, updated_at
      FROM site_settings
      WHERE id = 1
      LIMIT 1
    `).first();

    return jsonResponse({
      success: true,
      data: {
        settings: settings || {
          id: 1,
          site_title: "Free PDF Forms & Government Resources",
          site_subtitle: "Government forms and useful resources in one place",
          footer_text: "Free PDF Forms & Government Resources"
        }
      }
    }, 200, { ...commonHeaders, "Cache-Control": "no-store" });
  } catch (error) {
    console.error("Admin settings get error:", error);
    return jsonResponse({ success: false, error: "Unable to load website settings." }, 500, commonHeaders);
  }
}

function readAdminSettingsPayload(body) {
  const site_title = String(body?.site_title ?? "").trim();
  const site_subtitle = String(body?.site_subtitle ?? "").trim();
  const footer_text = String(body?.footer_text ?? "").trim();

  if (!site_title) return { error: "Website title is required." };
  if (site_title.length > 200) return { error: "Website title must be 200 characters or fewer." };
  if (site_subtitle.length > 500) return { error: "Subtitle must be 500 characters or fewer." };
  if (footer_text.length > 300) return { error: "Footer text must be 300 characters or fewer." };

  return { data: { site_title, site_subtitle, footer_text } };
}

async function handleAdminSettingsUpdate(request, env, commonHeaders) {
  const authError = await requireAdmin(request, env, commonHeaders);
  if (authError) return authError;

  const contentType = request.headers.get("Content-Type") || "";
  if (!contentType.includes("application/json")) {
    return jsonResponse({ success: false, error: "JSON request body is required." }, 400, commonHeaders);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ success: false, error: "Invalid JSON request." }, 400, commonHeaders);
  }

  const payload = readAdminSettingsPayload(body);
  if (payload.error) {
    return jsonResponse({ success: false, error: payload.error }, 400, commonHeaders);
  }

  try {
    const result = await env.DB.prepare(`
      UPDATE site_settings
      SET site_title = ?, site_subtitle = ?, footer_text = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
      RETURNING id, site_title, site_subtitle, footer_text, updated_at
    `).bind(
      payload.data.site_title,
      payload.data.site_subtitle,
      payload.data.footer_text
    ).first();

    if (!result) {
      await env.DB.prepare(`
        INSERT INTO site_settings (id, site_title, site_subtitle, footer_text)
        VALUES (1, ?, ?, ?)
      `).bind(
        payload.data.site_title,
        payload.data.site_subtitle,
        payload.data.footer_text
      ).run();

      const created = await env.DB.prepare(`
        SELECT id, site_title, site_subtitle, footer_text, updated_at
        FROM site_settings WHERE id = 1 LIMIT 1
      `).first();

      return jsonResponse({
        success: true,
        message: "Website settings updated successfully.",
        data: { settings: created }
      }, 200, { ...commonHeaders, "Cache-Control": "no-store" });
    }

    return jsonResponse({
      success: true,
      message: "Website settings updated successfully.",
      data: { settings: result }
    }, 200, { ...commonHeaders, "Cache-Control": "no-store" });
  } catch (error) {
    console.error("Admin settings update error:", error);
    return jsonResponse({ success: false, error: "Unable to update website settings." }, 500, commonHeaders);
  }
}

async function serveAdminPage(request, env, authenticated) {
  const target = authenticated ? "/__admin/dashboard.html" : "/__admin/login.html";
  return await serveAdminAsset(request, env, target);
}

async function serveAdminAsset(request, env, target) {
  const response = await env.ASSETS.fetch(
    new Request(new URL(target, request.url), { method: "GET", headers: request.headers })
  );

  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");
  headers.set("Pragma", "no-cache");
  headers.set("Expires", "0");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}


async function getAdminSession(request, env) {
  if (!env.DB) return null;

  const token = getAdminCookie(request);
  if (!token) return null;

  const tokenHash = await sha256Hex(token);

  const session = await env.DB.prepare(`
    SELECT
      s.id,
      s.user_id,
      s.expires_at,
      u.username
    FROM admin_sessions s
    INNER JOIN admin_users u
      ON u.id = s.user_id
    WHERE s.token_hash = ?
      AND s.expires_at > ?
      AND u.is_active = 1
    LIMIT 1
  `).bind(tokenHash, new Date().toISOString()).first();

  return session || null;
}


function getAdminCookie(request) {
  const cookieHeader = request.headers.get("Cookie") || "";

  for (const part of cookieHeader.split(";")) {
    const [rawName, ...rawValue] = part.trim().split("=");

    if (rawName === ADMIN_SESSION_COOKIE) {
      return rawValue.join("=") || "";
    }
  }

  return "";
}


function buildAdminCookie(token, maxAgeSeconds) {
  return [
    `${ADMIN_SESSION_COOKIE}=${token}`,
    "Path=/",
    `Max-Age=${maxAgeSeconds}`,
    "HttpOnly",
    "Secure",
    "SameSite=Lax"
  ].join("; ");
}


function clearAdminCookie() {
  return [
    `${ADMIN_SESSION_COOKIE}=`,
    "Path=/",
    "Max-Age=0",
    "HttpOnly",
    "Secure",
    "SameSite=Lax"
  ].join("; ");
}


function createRandomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);

  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}


async function secureSecretCompare(input, secret) {
  const [a, b] = await Promise.all([
    crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(String(input))
    ),
    crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(String(secret))
    )
  ]);

  const aa = new Uint8Array(a);
  const bb = new Uint8Array(b);

  let difference = aa.length ^ bb.length;

  for (let i = 0; i < Math.max(aa.length, bb.length); i++) {
    difference |= (aa[i] || 0) ^ (bb[i] || 0);
  }

  return difference === 0;
}


// ======================================================
// PUBLIC API FUNCTIONS
// ======================================================


/**
 * Get active departments.
 */
async function getDepartments(env, commonHeaders) {
  try {
    const result = await env.DB.prepare(`
      SELECT
        id,
        name,
        description,
        icon,
        sort_order
      FROM departments
      WHERE is_active = 1
      ORDER BY sort_order ASC, id ASC
    `).all();

    return jsonResponse({
      success: true,
      data: result.results || []
    }, 200, commonHeaders);

  } catch (error) {
    console.error("Departments API error:", error);

    return jsonResponse({
      success: false,
      error: "Unable to load departments."
    }, 500, commonHeaders);
  }
}



async function getPublicTools(env, commonHeaders) {
  try {
    const result = await env.DB.prepare(`
      SELECT id, name, slug, description, icon, category, sort_order,
             is_active, show_on_home, is_featured, version
      FROM tools
      WHERE is_active = 1
      ORDER BY sort_order ASC, id ASC
    `).all();

    return jsonResponse({
      success: true,
      data: result.results || []
    }, 200, { ...commonHeaders, "Cache-Control": "no-store" });
  } catch (error) {
    console.error("Public tools API error:", error);
    return jsonResponse({
      success: false,
      error: "Unable to load online tools."
    }, 500, commonHeaders);
  }
}

/**
 * Get active forms.
 *
 * Optional query:
 * /api/forms?department_id=1
 * /api/forms?search=school
 */
async function getForms(env, commonHeaders, url) {
  try {
    const departmentId = url.searchParams.get("department_id");
    const search = url.searchParams.get("search");

    let query = `
      SELECT
        f.id,
        f.department_id,
        d.name AS department_name,
        f.name,
        f.description,
        f.original_filename,
        f.file_size,
        f.sort_order,
        f.created_at
      FROM forms f
      INNER JOIN departments d
        ON d.id = f.department_id
      WHERE f.is_active = 1
        AND d.is_active = 1
    `;

    const bindings = [];

    if (departmentId) {
      const id = Number(departmentId);

      if (!Number.isInteger(id) || id < 1) {
        return jsonResponse({
          success: false,
          error: "Invalid department ID."
        }, 400, commonHeaders);
      }

      query += ` AND f.department_id = ?`;
      bindings.push(id);
    }

    if (search && search.trim() !== "") {
      const searchValue = `%${search.trim()}%`;

      query += `
        AND (
          f.name LIKE ?
          OR f.description LIKE ?
          OR d.name LIKE ?
        )
      `;

      bindings.push(
        searchValue,
        searchValue,
        searchValue
      );
    }

    query += `
      ORDER BY
        f.sort_order ASC,
        f.id ASC
    `;

    const result = await env.DB
      .prepare(query)
      .bind(...bindings)
      .all();

    return jsonResponse({
      success: true,
      data: result.results || []
    }, 200, commonHeaders);

  } catch (error) {
    console.error("Forms API error:", error);

    return jsonResponse({
      success: false,
      error: "Unable to load forms."
    }, 500, commonHeaders);
  }
}


/**
 * Get one active form.
 */
async function getSingleForm(env, commonHeaders, formId) {
  try {
    if (!Number.isInteger(formId) || formId < 1) {
      return jsonResponse({
        success: false,
        error: "Invalid form ID."
      }, 400, commonHeaders);
    }

    const result = await env.DB
      .prepare(`
        SELECT
          f.id,
          f.department_id,
          d.name AS department_name,
          f.name,
          f.description,
          f.original_filename,
          f.file_size,
          f.sort_order,
          f.created_at
        FROM forms f
        INNER JOIN departments d
          ON d.id = f.department_id
        WHERE f.id = ?
          AND f.is_active = 1
          AND d.is_active = 1
        LIMIT 1
      `)
      .bind(formId)
      .first();

    if (!result) {
      return jsonResponse({
        success: false,
        error: "Form not found."
      }, 404, commonHeaders);
    }

    return jsonResponse({
      success: true,
      data: result
    }, 200, commonHeaders);

  } catch (error) {
    console.error("Single form API error:", error);

    return jsonResponse({
      success: false,
      error: "Unable to load the form."
    }, 500, commonHeaders);
  }
}


/**
 * Get active government links.
 */
async function getGovernmentLinks(env, commonHeaders) {
  try {
    const result = await env.DB.prepare(`
      SELECT
        id,
        name,
        url,
        description,
        icon,
        sort_order
      FROM government_links
      WHERE is_active = 1
      ORDER BY sort_order ASC, id ASC
    `).all();

    return jsonResponse({
      success: true,
      data: result.results || []
    }, 200, commonHeaders);

  } catch (error) {
    console.error("Government links API error:", error);

    return jsonResponse({
      success: false,
      error: "Unable to load government links."
    }, 500, commonHeaders);
  }
}


/**
 * Get public website settings.
 */
async function getSiteSettings(env, commonHeaders) {
  try {
    const result = await env.DB.prepare(`
      SELECT
        site_title,
        site_subtitle,
        footer_text
      FROM site_settings
      WHERE id = 1
      LIMIT 1
    `).first();

    return jsonResponse({
      success: true,
      data: result || {
        site_title: "Free PDF Forms & Government Resources",
        site_subtitle: "",
        footer_text: ""
      }
    }, 200, commonHeaders);

  } catch (error) {
    console.error("Settings API error:", error);

    return jsonResponse({
      success: false,
      error: "Unable to load website settings."
    }, 500, commonHeaders);
  }
}


// ======================================================
// PDF HANDLING
// ======================================================


/**
 * Get PDF metadata from D1 and then retrieve
 * the actual PDF from R2.
 *
 * disposition:
 * - inline     = browser preview
 * - attachment = download
 */
async function servePdf(
  env,
  commonHeaders,
  formId,
  disposition
) {
  try {
    if (!Number.isInteger(formId) || formId < 1) {
      return pdfNotFoundResponse(
        commonHeaders,
        "Invalid PDF ID."
      );
    }

    const form = await env.DB
      .prepare(`
        SELECT
          id,
          name,
          original_filename,
          r2_key,
          mime_type
        FROM forms
        WHERE id = ?
          AND is_active = 1
        LIMIT 1
      `)
      .bind(formId)
      .first();

    if (!form) {
      return pdfNotFoundResponse(
        commonHeaders,
        "PDF form not found."
      );
    }

    if (!form.r2_key) {
      console.error(
        `Form ${formId} has no R2 object key.`
      );

      return pdfNotFoundResponse(
        commonHeaders,
        "PDF file is unavailable."
      );
    }

    if (!env.PDF_BUCKET) {
      console.error("PDF_BUCKET binding is missing.");

      return new Response(
        "PDF storage is not configured.",
        {
          status: 500,
          headers: {
            ...commonHeaders,
            "Content-Type": "text/plain; charset=UTF-8"
          }
        }
      );
    }

    const object = await env.PDF_BUCKET.get(form.r2_key);

    if (!object) {
      console.error(
        `R2 object not found: ${form.r2_key}`
      );

      return pdfNotFoundResponse(
        commonHeaders,
        "PDF file could not be found."
      );
    }

    const headers = new Headers(commonHeaders);

    headers.set(
      "Content-Type",
      form.mime_type || "application/pdf"
    );

    headers.set(
      "Content-Length",
      String(object.size)
    );

    headers.set(
      "Content-Disposition",
      `${disposition}; filename="${safeFilename(
        form.original_filename || `${form.name}.pdf`
      )}"`
    );

    headers.set(
      "Cache-Control",
      "public, max-age=3600"
    );

    if (object.httpMetadata) {
      if (object.httpMetadata.contentType) {
        headers.set(
          "Content-Type",
          object.httpMetadata.contentType
        );
      }

      if (object.httpMetadata.contentLanguage) {
        headers.set(
          "Content-Language",
          object.httpMetadata.contentLanguage
        );
      }
    }

    return new Response(object.body, {
      status: 200,
      headers
    });

  } catch (error) {
    console.error("PDF serving error:", error);

    return new Response(
      "Unable to load the PDF.",
      {
        status: 500,
        headers: {
          ...commonHeaders,
          "Content-Type": "text/plain; charset=UTF-8"
        }
      }
    );
  }
}


/**
 * PDF 404 response.
 */
function pdfNotFoundResponse(
  commonHeaders,
  message
) {
  return new Response(message, {
    status: 404,
    headers: {
      ...commonHeaders,
      "Content-Type": "text/plain; charset=UTF-8"
    }
  });
}


/**
 * Prevent dangerous characters in downloaded filenames.
 */
function safeFilename(filename) {
  return String(filename)
    .replace(/[\r\n"]/g, "")
    .replace(/[\\/]/g, "_")
    .trim()
    .slice(0, 180) || "document.pdf";
}


// ======================================================
// RESPONSE HELPERS
// ======================================================



// Serve a public tool page only when the tool is active.
// show_on_home controls Home-page visibility only; it does not
// prevent an active tool from being opened directly.
async function servePublicToolPage(request, env, commonHeaders, toolSlug) {
  try {
    const tool = await env.DB.prepare(`
      SELECT id, slug, is_active
      FROM tools
      WHERE slug = ?
      LIMIT 1
    `).bind(toolSlug).first();

    if (!tool || Number(tool.is_active) !== 1) {
      return new Response("Tool not available.", {
        status: 404,
        headers: {
          ...commonHeaders,
          "Cache-Control": "no-store",
          "Content-Type": "text/plain; charset=UTF-8"
        }
      });
    }

    if (!env.ASSETS) {
      return new Response("Tool is unavailable.", {
        status: 500,
        headers: {
          ...commonHeaders,
          "Content-Type": "text/plain; charset=UTF-8"
        }
      });
    }

    const targetUrl = new URL(`/tools/${toolSlug}/index.html`, request.url);
    const assetRequest = new Request(targetUrl.toString(), {
      method: "GET",
      headers: request.headers
    });

    const response = await env.ASSETS.fetch(assetRequest);
    const headers = new Headers(response.headers);
    headers.set("Cache-Control", "no-store");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  } catch (error) {
    console.error("Public tool access error:", error);
    return new Response("Tool is unavailable.", {
      status: 500,
      headers: {
        ...commonHeaders,
        "Cache-Control": "no-store",
        "Content-Type": "text/plain; charset=UTF-8"
      }
    });
  }
}

function jsonResponse(
  data,
  status = 200,
  additionalHeaders = {}
) {
  const headers = new Headers({
    "Content-Type": "application/json; charset=UTF-8",
    ...additionalHeaders
  });

  return new Response(
    JSON.stringify(data),
    {
      status,
      headers
    }
  );
}

// ======================================================
// PASSPORT PHOTO AI
// ======================================================

const PASSPORT_AI_MODEL = "@cf/black-forest-labs/flux-2-klein-4b";
const AI_REQUEST_LIMIT = 100;
const AI_ESTIMATED_NEURONS_PER_REQUEST = 32;
const AI_DAILY_NEURON_GUARD = 9000; // Safety guard below Cloudflare's 10,000 free neurons/day.
const AI_INPUT_MAX_BYTES = 6 * 1024 * 1024;

async function handlePassportAI(request, env, commonHeaders) {
  try {
    if (!env.AI) {
      return jsonResponse({
        success: false,
        code: "AI_NOT_CONFIGURED",
        error: "AI enhancement is not configured on this website yet."
      }, 503, commonHeaders);
    }

    if (!env.DB) {
      return jsonResponse({
        success: false,
        code: "AI_STORAGE_NOT_CONFIGURED",
        error: "AI usage protection is not configured."
      }, 503, commonHeaders);
    }

    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const ipHash = await sha256Hex(ip);
    const now = Date.now();
    const cutoff = now - 24 * 60 * 60 * 1000;

    await ensureAIUsageTables(env.DB);

    const day = new Date().toISOString().slice(0, 10);

    const contentType = request.headers.get("content-type") || "";
    if (!contentType.toLowerCase().includes("multipart/form-data")) {
      return jsonResponse({
        success: false,
        code: "INVALID_REQUEST",
        error: "Please upload an image."
      }, 400, commonHeaders);
    }

    const form = await request.formData();
    const image = form.get("image");
    const mode = String(form.get("mode") || "enhance").toLowerCase();
    const dress = String(form.get("dress") || "none").toLowerCase();

    if (!(image instanceof File)) {
      return jsonResponse({
        success: false,
        code: "IMAGE_REQUIRED",
        error: "Please select an image."
      }, 400, commonHeaders);
    }

    if (image.size < 1 || image.size > AI_INPUT_MAX_BYTES) {
      return jsonResponse({
        success: false,
        code: "IMAGE_TOO_LARGE",
        error: "Please use an image up to 6 MB."
      }, 400, commonHeaders);
    }

    const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (!allowedTypes.has(image.type)) {
      return jsonResponse({
        success: false,
        code: "INVALID_IMAGE",
        error: "Only JPG, PNG and WebP images are supported."
      }, 400, commonHeaders);
    }

    if (!["enhance", "dress"].includes(mode)) {
      return jsonResponse({
        success: false,
        code: "INVALID_MODE",
        error: "Invalid AI mode."
      }, 400, commonHeaders);
    }

    const dressPrompts = {
      "white-shirt": "Change only the person's clothing to a clean, simple formal white shirt. Keep the exact same person, face, facial features, skin tone, hairstyle, pose, camera angle and identity. Do not beautify or reshape the face.",
      "formal-shirt": "Change only the person's clothing to a neat professional formal shirt. Keep the exact same person, face, facial features, skin tone, hairstyle, pose, camera angle and identity. Do not beautify or reshape the face.",
      "suit": "Change only the person's clothing to a professional dark formal business suit with a simple shirt. Keep the exact same person, face, facial features, skin tone, hairstyle, pose, camera angle and identity. Do not beautify or reshape the face.",
      "suit-tie": "Change only the person's clothing to a professional formal business suit with a simple shirt and tie. Keep the exact same person, face, facial features, skin tone, hairstyle, pose, camera angle and identity. Do not beautify or reshape the face."
    };

    let prompt;
    if (mode === "dress") {
      if (!dressPrompts[dress]) {
        return jsonResponse({
          success: false,
          code: "INVALID_DRESS",
          error: "Please select a valid formal dress option."
        }, 400, commonHeaders);
      }
      prompt =
        "Edit this passport-style portrait conservatively. " +
        dressPrompts[dress] +
        " Keep the original background, lighting, framing and image composition as much as possible. " +
        "Do not add objects, text, jewelry, hats or extra people.";
    } else {
      prompt =
        "Enhance this passport-style portrait conservatively. " +
        "Keep the exact same person and identity, facial structure, skin tone, hairstyle, clothing, pose and framing. " +
        "Improve clarity, mild sharpness, exposure, white balance, natural lighting and color balance. " +
        "Reduce mild blur and compression artifacts without inventing facial details. " +
        "Do not change the face, age, expression, body shape, clothing or background. " +
        "Do not add objects, text, jewelry, hats or extra people. " +
        "The result must remain a realistic photograph suitable for a passport or government application.";
    }

    // Atomic 5-request reservation per IP over the last 24 hours.
    // If the insert returns no row, this request is blocked before AI is called.
    const userReservation = await env.DB.prepare(`
      INSERT INTO ai_passport_requests (ip_hash, created_at, mode)
      SELECT ?, ?, ?
      WHERE (
        SELECT COUNT(*)
        FROM ai_passport_requests
        WHERE ip_hash = ? AND created_at >= ?
      ) < ?
      RETURNING id
    `).bind(
      ipHash, now, mode,
      ipHash, cutoff,
      AI_REQUEST_LIMIT
    ).first();

    if (!userReservation) {
      return jsonResponse({
        success: false,
        code: "AI_USER_LIMIT",
        error: "Your free AI limit of 100 requests in 24 hours has been reached. Please try again later.",
        remaining: 0
      }, 429, commonHeaders);
    }

    // Atomic global safety reservation. We stop at 9,000 estimated neurons,
    // leaving a safety margin below Cloudflare's 10,000 free-neuron allocation.
    const globalReservation = await env.DB.prepare(`
      INSERT INTO ai_passport_global (usage_day, estimated_neurons, locked, updated_at)
      VALUES (?, ?, 0, ?)
      ON CONFLICT(usage_day) DO UPDATE SET
        estimated_neurons = estimated_neurons + excluded.estimated_neurons,
        updated_at = excluded.updated_at
      WHERE ai_passport_global.locked = 0
        AND ai_passport_global.estimated_neurons + excluded.estimated_neurons <= ?
      RETURNING estimated_neurons
    `).bind(
      day,
      AI_ESTIMATED_NEURONS_PER_REQUEST,
      now,
      AI_DAILY_NEURON_GUARD
    ).first();

    if (!globalReservation) {
      await env.DB.prepare(`
        INSERT INTO ai_passport_global (usage_day, estimated_neurons, locked, updated_at)
        VALUES (?, 0, 1, ?)
        ON CONFLICT(usage_day) DO UPDATE SET
          locked = 1,
          updated_at = excluded.updated_at
      `).bind(day, now).run();

      return jsonResponse({
        success: false,
        code: "AI_DAILY_LIMIT",
        error: "Today's free AI limit has been reached. AI tools are temporarily unavailable. Please try again tomorrow."
      }, 429, commonHeaders);
    }

    // The model requires reference images smaller than 512x512.
    const originalBytes = new Uint8Array(await image.arrayBuffer());
    const inputBlob = new Blob([originalBytes], { type: image.type });

    const aiForm = new FormData();
    aiForm.append("input_image_0", inputBlob, "passport-input." + extensionForType(image.type));
    aiForm.append("prompt", prompt);
    aiForm.append("width", "512");
    aiForm.append("height", "512");
    aiForm.append("guidance", "2.5");

    const serialized = new Response(aiForm);
    const aiResponse = await env.AI.run(PASSPORT_AI_MODEL, {
      multipart: {
        body: serialized.body,
        contentType: serialized.headers.get("content-type")
      }
    });

    const output = extractAIImage(aiResponse);

    if (!output) {
      throw new Error("The AI model returned no image.");
    }

    const responseHeaders = {
      ...commonHeaders,
      "Content-Type": "image/png",
      "Cache-Control": "no-store",
      "Content-Disposition": 'inline; filename="passport-ai-result.png"'
    };

    return new Response(output, {
      status: 200,
      headers: responseHeaders
    });

  } catch (error) {
    console.error("Passport AI error:", error);

    const message = String(error?.message || error || "");
    const lower = message.toLowerCase();

    if (
      lower.includes("limit") ||
      lower.includes("quota") ||
      lower.includes("neuron") ||
      lower.includes("429") ||
      lower.includes("3036")
    ) {
      const common = {
        ...commonHeaders,
        "Cache-Control": "no-store"
      };
      return jsonResponse({
        success: false,
        code: "AI_DAILY_LIMIT",
        error: "Today's free AI limit has been reached. AI tools are temporarily unavailable. Please try again tomorrow."
      }, 429, common);
    }

    return jsonResponse({
      success: false,
      code: "AI_FAILED",
      error: "AI enhancement could not be completed. Your image was not changed. Please try again or use Normal mode."
    }, 500, commonHeaders);
  }
}

async function getPassportAIStatus(request, env, commonHeaders) {
  try {
    await ensureAIUsageTables(env.DB);

    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const ipHash = await sha256Hex(ip);
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const day = new Date().toISOString().slice(0, 10);

    await env.DB.prepare(
      `DELETE FROM ai_passport_requests WHERE created_at < ?`
    ).bind(cutoff).run();

    const row = await env.DB.prepare(`
      SELECT COUNT(*) AS count
      FROM ai_passport_requests
      WHERE ip_hash = ? AND created_at >= ?
    `).bind(ipHash, cutoff).first();

    const global = await env.DB.prepare(`
      SELECT estimated_neurons, locked
      FROM ai_passport_global
      WHERE usage_day = ?
      LIMIT 1
    `).bind(day).first();

    const used = Number(row?.count || 0);
    const locked = Number(global?.locked || 0) === 1 ||
      Number(global?.estimated_neurons || 0) + AI_ESTIMATED_NEURONS_PER_REQUEST > AI_DAILY_NEURON_GUARD;

    return jsonResponse({
      success: true,
      remaining: Math.max(0, AI_REQUEST_LIMIT - used),
      dailyUserLimit: AI_REQUEST_LIMIT,
      aiAvailable: !locked,
      message: locked
        ? "Today's free AI limit has been reached."
        : "AI is available."
    }, 200, commonHeaders);

  } catch (error) {
    console.error("Passport AI status error:", error);
    return jsonResponse({
      success: false,
      error: "Unable to check AI availability."
    }, 500, commonHeaders);
  }
}

async function ensureAIUsageTables(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS ai_passport_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      mode TEXT NOT NULL
    )
  `).run();

  await db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_ai_passport_requests_ip_time
    ON ai_passport_requests(ip_hash, created_at)
  `).run();

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS ai_passport_global (
      usage_day TEXT PRIMARY KEY,
      estimated_neurons REAL NOT NULL DEFAULT 0,
      locked INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    )
  `).run();
}

function extensionForType(type) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

function extractAIImage(result) {
  if (!result) return null;

  let value = result.image ?? result.data?.[0]?.image ?? result.result?.image;

  if (value instanceof ArrayBuffer) return value;
  if (value instanceof Uint8Array) return value;

  if (typeof value === "string") {
    // Cloudflare model output is documented as a Base64 image string.
    const clean = value.includes(",") && value.startsWith("data:")
      ? value.split(",")[1]
      : value;
    return base64ToUint8Array(clean);
  }

  return null;
}

function base64ToUint8Array(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

const ADMIN_FORM_MAX_BYTES = 25 * 1024 * 1024;

function cleanPdfFilename(filename) {
  const raw = String(filename || "document.pdf").trim() || "document.pdf";
  const noPath = raw.replace(/[\\/]+/g, "-");
  const cleaned = noPath.replace(/[^a-zA-Z0-9._ -]/g, "_").replace(/\s+/g, " ").trim();
  return cleaned.slice(-160) || "document.pdf";
}

function isPdfUpload(file) {
  if (!file || typeof file.arrayBuffer !== "function") return false;
  const type = String(file.type || "").toLowerCase();
  const name = String(file.name || "").toLowerCase();
  return type === "application/pdf" || name.endsWith(".pdf");
}

async function requireAdmin(request, env, commonHeaders) {
  const session = await getAdminSession(request, env);
  if (!session) {
    return jsonResponse({
      success: false,
      code: "UNAUTHORIZED",
      error: "Admin login required."
    }, 401, commonHeaders);
  }
  return null;
}

async function handleAdminFormsList(request, env, commonHeaders, url) {
  const authError = await requireAdmin(request, env, commonHeaders);
  if (authError) return authError;

  try {
    const search = String(url.searchParams.get("search") || "").trim();
    const params = [];
    let where = "";

    if (search) {
      where = `WHERE lower(f.name) LIKE lower(?) OR lower(COALESCE(f.description, '')) LIKE lower(?) OR lower(f.original_filename) LIKE lower(?) OR lower(d.name) LIKE lower(?)`;
      const q = `%${search.slice(0, 120)}%`;
      params.push(q, q, q, q);
    }

    const sql = `
      SELECT
        f.id,
        f.department_id,
        d.name AS department_name,
        f.name,
        f.description,
        f.r2_key,
        f.original_filename,
        f.file_size,
        f.mime_type,
        f.sort_order,
        f.is_active,
        f.created_at,
        f.updated_at
      FROM forms f
      INNER JOIN departments d ON d.id = f.department_id
      ${where}
      ORDER BY d.sort_order ASC, f.sort_order ASC, f.id ASC
      LIMIT 500
    `;

    const result = await env.DB.prepare(sql).bind(...params).all();

    return jsonResponse({
      success: true,
      data: { forms: result.results || [] }
    }, 200, { ...commonHeaders, "Cache-Control": "no-store" });
  } catch (error) {
    console.error("Admin forms list error:", error);
    return jsonResponse({ success: false, error: "Unable to load PDF forms." }, 500, commonHeaders);
  }
}

async function parseAdminFormMultipart(request) {
  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength && contentLength > ADMIN_FORM_MAX_BYTES + 2 * 1024 * 1024) {
    return { error: "Request is too large. Maximum PDF size is 25 MB." };
  }

  const contentType = request.headers.get("Content-Type") || "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data")) {
    return { error: "Multipart form data is required." };
  }

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return { error: "Unable to read uploaded form data." };
  }

  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const departmentId = Number(formData.get("department_id"));
  const sortRaw = formData.get("sort_order");
  const sortOrder = Number.isFinite(Number(sortRaw)) ? Math.trunc(Number(sortRaw)) : 0;
  const isActiveValue = formData.get("is_active");
  const isActive = isActiveValue === "0" || isActiveValue === "false" || isActiveValue === false ? 0 : 1;
  const file = formData.get("pdf_file");

  if (!name) return { error: "Form name is required." };
  if (name.length > 200) return { error: "Form name must be 200 characters or fewer." };
  if (description.length > 1000) return { error: "Description must be 1000 characters or fewer." };
  if (!Number.isInteger(departmentId) || departmentId < 1) return { error: "Please select a valid department." };
  if (sortOrder < 0 || sortOrder > 999999) return { error: "Sort order must be between 0 and 999999." };

  let upload = null;
  if (file && typeof file.arrayBuffer === "function" && Number(file.size || 0) > 0) {
    if (Number(file.size) > ADMIN_FORM_MAX_BYTES) return { error: "PDF is too large. Maximum allowed size is 25 MB." };
    if (!isPdfUpload(file)) return { error: "Only PDF files are allowed." };
    upload = file;
  }

  return {
    data: {
      departmentId,
      name,
      description,
      sortOrder,
      isActive,
      upload
    }
  };
}

async function ensureAdminFormDepartment(env, departmentId) {
  return await env.DB.prepare(`SELECT id FROM departments WHERE id = ? LIMIT 1`).bind(departmentId).first();
}

function makePdfR2Key(fileName) {
  const safe = cleanPdfFilename(fileName).replace(/\.pdf$/i, "") || "document";
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const unique = crypto.randomUUID();
  return `pdfs/${year}/${month}/${unique}-${safe}.pdf`;
}

async function handleAdminFormCreate(request, env, commonHeaders) {
  const authError = await requireAdmin(request, env, commonHeaders);
  if (authError) return authError;
  if (!env.PDF_BUCKET) return jsonResponse({ success: false, error: "PDF storage is not configured." }, 500, commonHeaders);

  let uploadedKey = null;

  try {
    const payload = await parseAdminFormMultipart(request);
    if (payload.error) return jsonResponse({ success: false, error: payload.error }, 400, commonHeaders);

    const department = await ensureAdminFormDepartment(env, payload.data.departmentId);
    if (!department) return jsonResponse({ success: false, error: "Selected department does not exist." }, 400, commonHeaders);
    if (!payload.data.upload) return jsonResponse({ success: false, error: "Please choose a PDF file." }, 400, commonHeaders);

    uploadedKey = makePdfR2Key(payload.data.upload.name);
    await env.PDF_BUCKET.put(uploadedKey, payload.data.upload.stream(), {
      httpMetadata: { contentType: "application/pdf" },
      customMetadata: { originalFilename: cleanPdfFilename(payload.data.upload.name) }
    });

    const fileSize = Number(payload.data.upload.size || 0);
    const originalFilename = cleanPdfFilename(payload.data.upload.name);

    const result = await env.DB.prepare(`
      INSERT INTO forms (
        department_id, name, description, r2_key, original_filename,
        file_size, mime_type, sort_order, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING id, department_id, name, description, r2_key, original_filename,
                file_size, mime_type, sort_order, is_active, created_at, updated_at
    `).bind(
      payload.data.departmentId,
      payload.data.name,
      payload.data.description,
      uploadedKey,
      originalFilename,
      fileSize,
      "application/pdf",
      payload.data.sortOrder,
      payload.data.isActive
    ).first();

    return jsonResponse({
      success: true,
      message: "PDF form uploaded successfully.",
      data: { form: result }
    }, 201, { ...commonHeaders, "Cache-Control": "no-store" });
  } catch (error) {
    if (uploadedKey) {
      try { await env.PDF_BUCKET.delete(uploadedKey); } catch (cleanupError) { console.error("R2 cleanup after form create failure failed:", cleanupError); }
    }
    console.error("Admin form create error:", error);
    return jsonResponse({ success: false, error: "Unable to upload PDF form." }, 500, commonHeaders);
  }
}

async function getAdminFormRecord(env, formId) {
  return await env.DB.prepare(`
    SELECT f.*, d.name AS department_name
    FROM forms f
    INNER JOIN departments d ON d.id = f.department_id
    WHERE f.id = ?
    LIMIT 1
  `).bind(formId).first();
}

async function handleAdminFormGet(request, env, commonHeaders, formId) {
  const authError = await requireAdmin(request, env, commonHeaders);
  if (authError) return authError;
  if (!Number.isInteger(formId) || formId < 1) return jsonResponse({ success: false, error: "Invalid form ID." }, 400, commonHeaders);

  try {
    const form = await getAdminFormRecord(env, formId);
    if (!form) return jsonResponse({ success: false, code: "NOT_FOUND", error: "PDF form not found." }, 404, commonHeaders);
    return jsonResponse({ success: true, data: { form } }, 200, { ...commonHeaders, "Cache-Control": "no-store" });
  } catch (error) {
    console.error("Admin form get error:", error);
    return jsonResponse({ success: false, error: "Unable to load PDF form." }, 500, commonHeaders);
  }
}

async function handleAdminFormUpdate(request, env, commonHeaders, formId) {
  const authError = await requireAdmin(request, env, commonHeaders);
  if (authError) return authError;
  if (!Number.isInteger(formId) || formId < 1) return jsonResponse({ success: false, error: "Invalid form ID." }, 400, commonHeaders);
  if (!env.PDF_BUCKET) return jsonResponse({ success: false, error: "PDF storage is not configured." }, 500, commonHeaders);

  let newKey = null;
  try {
    const existing = await getAdminFormRecord(env, formId);
    if (!existing) return jsonResponse({ success: false, code: "NOT_FOUND", error: "PDF form not found." }, 404, commonHeaders);

    const payload = await parseAdminFormMultipart(request);
    if (payload.error) return jsonResponse({ success: false, error: payload.error }, 400, commonHeaders);

    const department = await ensureAdminFormDepartment(env, payload.data.departmentId);
    if (!department) return jsonResponse({ success: false, error: "Selected department does not exist." }, 400, commonHeaders);

    let r2Key = existing.r2_key;
    let originalFilename = existing.original_filename;
    let fileSize = Number(existing.file_size || 0);

    if (payload.data.upload) {
      newKey = makePdfR2Key(payload.data.upload.name);
      await env.PDF_BUCKET.put(newKey, payload.data.upload.stream(), {
        httpMetadata: { contentType: "application/pdf" },
        customMetadata: { originalFilename: cleanPdfFilename(payload.data.upload.name) }
      });
      r2Key = newKey;
      originalFilename = cleanPdfFilename(payload.data.upload.name);
      fileSize = Number(payload.data.upload.size || 0);
    }

    const result = await env.DB.prepare(`
      UPDATE forms
      SET department_id = ?,
          name = ?,
          description = ?,
          r2_key = ?,
          original_filename = ?,
          file_size = ?,
          mime_type = 'application/pdf',
          sort_order = ?,
          is_active = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      RETURNING id, department_id, name, description, r2_key, original_filename,
                file_size, mime_type, sort_order, is_active, created_at, updated_at
    `).bind(
      payload.data.departmentId,
      payload.data.name,
      payload.data.description,
      r2Key,
      originalFilename,
      fileSize,
      payload.data.sortOrder,
      payload.data.isActive,
      formId
    ).first();

    if (newKey && existing.r2_key && existing.r2_key !== newKey) {
      try { await env.PDF_BUCKET.delete(existing.r2_key); } catch (cleanupError) { console.error("Old R2 PDF cleanup after update failed:", cleanupError); }
    }

    return jsonResponse({ success: true, message: "PDF form updated successfully.", data: { form: result } }, 200, { ...commonHeaders, "Cache-Control": "no-store" });
  } catch (error) {
    if (newKey) {
      try { await env.PDF_BUCKET.delete(newKey); } catch (cleanupError) { console.error("R2 cleanup after form update failure failed:", cleanupError); }
    }
    console.error("Admin form update error:", error);
    return jsonResponse({ success: false, error: "Unable to update PDF form." }, 500, commonHeaders);
  }
}

async function handleAdminFormDelete(request, env, commonHeaders, formId) {
  const authError = await requireAdmin(request, env, commonHeaders);
  if (authError) return authError;
  if (!Number.isInteger(formId) || formId < 1) return jsonResponse({ success: false, error: "Invalid form ID." }, 400, commonHeaders);

  try {
    const existing = await getAdminFormRecord(env, formId);
    if (!existing) return jsonResponse({ success: false, code: "NOT_FOUND", error: "PDF form not found." }, 404, commonHeaders);

    await env.DB.prepare(`DELETE FROM forms WHERE id = ?`).bind(formId).run();

    let storageWarning = "";
    if (existing.r2_key && env.PDF_BUCKET) {
      try {
        await env.PDF_BUCKET.delete(existing.r2_key);
      } catch (storageError) {
        console.error("R2 delete after form deletion failed:", storageError);
        storageWarning = " The database record was deleted, but the R2 file could not be removed automatically.";
      }
    }

    return jsonResponse({
      success: true,
      message: `PDF form deleted successfully.${storageWarning}`,
      warning: storageWarning || undefined
    }, 200, { ...commonHeaders, "Cache-Control": "no-store" });
  } catch (error) {
    console.error("Admin form delete error:", error);
    return jsonResponse({ success: false, error: "Unable to delete PDF form." }, 500, commonHeaders);
  }
}

async function sha256Hex(value) {
  const data = new TextEncoder().encode(String(value));
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}
