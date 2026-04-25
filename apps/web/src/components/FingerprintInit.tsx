"use client";

import { useEffect } from "react";
import { getVisitorId } from "@/lib/fingerprint";

/**
 * Bootstraps the FingerprintJS visitor id on the client so the first tRPC
 * mutation already carries an `x-visitor-id` header. Renders nothing.
 */
export default function FingerprintInit() {
  useEffect(() => {
    getVisitorId();
  }, []);
  return null;
}
