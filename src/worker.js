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
      // Passport Photo AI endpoints
      // --------------------------------------------------

      if (path === "/api/ai/passport" && request.method === "POST") {
        return await handlePassportAI(request, env, commonHeaders);
      }

      if (path === "/api/ai/status" && request.method === "GET") {
        return await getPassportAIStatus(request, env, commonHeaders);
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

async function sha256Hex(value) {
  const data = new TextEncoder().encode(String(value));
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}