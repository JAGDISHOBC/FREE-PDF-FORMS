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
