const evoUrl = process.env.EVOLUTION_API_URL || "http://srv804668.hstgr.cloud:62708";
// ⚠️ GLOBAL token – ONLY for instance management (/instance/*)
// NEVER use this to send messages; use the instance token stored in the DB
const evoGlobalKey = process.env.EVOLUTION_API_TOKEN || "8nnLKHWKwVwOQbp4nh1Gr2LS3o8LAgr1";

/**
 * Format phone number to clean digits for Evolution API.
 * Brazil-aware: handles DDI, DDD, and mobile 9-digit prefix.
 *
 * Expected output format: 55 + DDD (2 digits) + Number (8-9 digits)
 * e.g.: 5511999999999
 */
export function formatPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");

  // Already has DDI 55 (>= 12 chars: 55 + DDD + 9 digits)
  if (digits.length >= 12 && digits.startsWith("55")) {
    return digits;
  }

  // 11 digits: DDD + 9-digit mobile number → add DDI
  if (digits.length === 11) {
    return `55${digits}`;
  }

  // 10 digits: DDD + 8-digit (landline or old mobile) → add DDI
  if (digits.length === 10) {
    return `55${digits}`;
  }

  // 9 digits: 9-digit number without DDD → assume SP (11)
  if (digits.length === 9) {
    return `5511${digits}`;
  }

  // Fallback: prepend 55 and hope for the best
  return `55${digits}`;
}

/**
 * Dispatches text message to WhatsApp via Evolution API instance
 */
/**
 * Dispatches text message to WhatsApp via Evolution API instance.
 *
 * ⚠️ CRITICAL: instanceToken is the per-instance token returned in `hash` field
 * when the instance was created. This is DIFFERENT from the global API key.
 * The /message/* endpoints REQUIRE the instance token, not the global key.
 *
 * @param instanceName  - Name of the Evolution API instance
 * @param toPhone       - Recipient phone number (any format; will be normalized)
 * @param text          - Message text
 * @param instanceToken - Instance-specific token (from whatsapp_instances.token in DB)
 *                        If omitted, falls back to global key (may cause 401 errors)
 */
export async function sendWhatsAppMessage(
  instanceName: string,
  toPhone: string,
  text: string,
  instanceToken?: string
): Promise<any> {
  const cleanPhone = formatPhoneNumber(toPhone);
  const url = `${evoUrl}/message/sendText/${instanceName}`;

  // Use instance token for message endpoints; global key is only for /instance/*
  const authToken = instanceToken || evoGlobalKey;
  if (!instanceToken) {
    console.warn(
      `[Evolution] sendWhatsAppMessage called without instanceToken for "${instanceName}". ` +
      `Falling back to global key — this will likely cause a 401 error. ` +
      `Ensure the instance token is fetched from the DB and passed here.`
    );
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": authToken
      },
      body: JSON.stringify({
        number: cleanPhone,
        text: text,
        options: {
          delay: 1200,
          presence: "composing"
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Evolution API Error ${response.status}: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`[Evolution] Failed to send WhatsApp message via instance "${instanceName}":`, error);
    throw error;
  }
}

/**
 * Fetches instance connection state from Evolution API
 */
export async function getConnectState(instanceName: string): Promise<"CONNECTED" | "DISCONNECTED" | "CONNECTING"> {
  const url = `${evoUrl}/instance/connectionState/${instanceName}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        // ✅ Instance management → use GLOBAL key
        "apikey": evoGlobalKey
      }
    });

    if (!response.ok) {
      return "DISCONNECTED";
    }

    const data = await response.json();
    const state = data?.instance?.state || data?.state;
    if (state === "open" || state === "CONNECTED") return "CONNECTED";
    if (state === "connecting" || state === "CONNECTING") return "CONNECTING";
    return "DISCONNECTED";
  } catch (error) {
    console.error(`[Evolution] Failed to retrieve connection state for instance "${instanceName}":`, error);
    return "DISCONNECTED";
  }
}

/**
 * Generates pairing QR code for instance
 */
export async function generateQrCode(instanceName: string): Promise<string | null> {
  const url = `${evoUrl}/instance/connect/${instanceName}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        // ✅ Instance management → use GLOBAL key
        "apikey": evoGlobalKey
      }
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const qrcode = data?.qrcode?.base64 || data?.base64 || data?.qrcode || data?.code || null;
    
    if (qrcode && typeof qrcode === "string" && !qrcode.startsWith("data:image")) {
      return `data:image/png;base64,${qrcode}`;
    }
    return qrcode;
  } catch (error) {
    console.error(`[Evolution] Failed to retrieve QR code for instance "${instanceName}":`, error);
    return null;
  }
}

/**
 * Create a new instance in Evolution API
 */
export async function createEvoInstance(instanceName: string, phone: string): Promise<any> {
  const url = `${evoUrl}/instance/create`;
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // ✅ Instance management → use GLOBAL key
        "apikey": evoGlobalKey
      },
      body: JSON.stringify({
        instanceName,
        integration: "WHATSAPP-BAILEYS",
        qrcode: true,
        number: formatPhoneNumber(phone)
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create instance: ${response.status} - ${errorText}`);
    }

    // ⚠️ IMPORTANT: The instance token is in response.hash — save it to the DB!
    return await response.json();
  } catch (error) {
    console.error(`[Evolution] Failed to create instance "${instanceName}":`, error);
    throw error;
  }
}

/**
 * Delete an instance from Evolution API
 */
export async function deleteEvoInstance(instanceName: string): Promise<any> {
  const url = `${evoUrl}/instance/delete/${instanceName}`;
  
  try {
    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        // ✅ Instance management → use GLOBAL key
        "apikey": evoGlobalKey
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to delete instance: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`[Evolution] Failed to delete instance "${instanceName}":`, error);
    throw error;
  }
}

/**
 * Logout an instance from Evolution API
 */
export async function logoutEvoInstance(instanceName: string): Promise<any> {
  const url = `${evoUrl}/instance/logout/${instanceName}`;
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        // ✅ Instance management → use GLOBAL key
        "apikey": evoGlobalKey
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to logout instance: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`[Evolution] Failed to logout instance "${instanceName}":`, error);
    throw error;
  }
}

/**
 * Set Webhook for Evolution API instance
 */
export async function setEvoWebhook(instanceName: string, webhookUrl: string): Promise<any> {
  const url = `${evoUrl}/webhook/set/${instanceName}`;
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // ✅ Instance management → use GLOBAL key
        "apikey": evoGlobalKey
      },
      body: JSON.stringify({
        webhook: {
          enabled: true,
          url: webhookUrl,
          by: "default",
          base64: false,
          events: [
            "CONNECTION_UPDATE",
            "MESSAGES_UPSERT",
            "SEND_MESSAGE"
          ]
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to set webhook: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Failed to set webhook for instance ${instanceName}`, error);
    throw error;
  }
}
